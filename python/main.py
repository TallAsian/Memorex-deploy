import boto3
import io
import json
import smtplib
import os
import stripe
import jwt
import cognitojwt
import time
from botocore.client import Config
from twilio.rest import Client
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from boto3.dynamodb.conditions import Key, Attr
from fastapi import Body, FastAPI, Request, Form, Response, File, UploadFile
from typing import List
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from datetime import date
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

stripe.api_key = "sk_test_51MjQdBAB1aJ9omUKkgCZWRsSUq6kzLl0OQHGYH9smakMaYl3YcdAmaNm6iwR8y9Gy3LjsU3vMG2XY8mQ0aACLs0t006roSgoOB"
awsAccessKey = "AKIAX3FHVXYSKFFYPGE7"
awsSecretAccessKey = "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"

dynamodb = boto3.resource('dynamodb', region_name="us-east-2",
         aws_access_key_id=awsAccessKey,
         aws_secret_access_key= awsSecretAccessKey)
table = dynamodb.Table('test6-DB-staging')

s3Bucket = boto3.resource(service_name='s3', region_name='us-east-2', 
         aws_access_key_id=awsAccessKey, aws_secret_access_key=awsSecretAccessKey)

s3_client = boto3.client('s3', aws_access_key_id=awsAccessKey, aws_secret_access_key=awsSecretAccessKey, region_name='us-east-2')

bucket = s3Bucket.Bucket('memorexbucket134102-dev')

cognito = boto3.client('cognito-idp')

twilio_sid = 'ACf436585983fcf4df53a1db5fd2246db7'
twilio_auth_token = 'fffd7c4699ab70c339b9bb170437ce01'
twilio = Client(twilio_sid, twilio_auth_token)

# email address and app password for sending emails
myEmail = "hjeffersonriver@gmail.com"
myPassword = "mweqtwxuiftugeyc"

app.add_middleware(
    CORSMiddleware,
    allow_origins="http://localhost:8080/",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TestResult(BaseModel):
    result: int | None = None
    patientId: str | None = None
    testId: str | None = None

class Payment(BaseModel):
    subId: str | None = None
    id: str | None = None
    email: str | None = None
    name: str | None = None
 
class Test(BaseModel):
    fileName: str | None = None
    patientEmail: str | None = None
    testId: str | None = None
    status: str | None = None
    score: str | None = None
    dateSent: str | None = None
    link: str | None = None

class Patient(BaseModel):
    PK: str | None = None
    SK: str | None = None
    physicianEmail: str | None = None
    oldEmail: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    phoneNumber: str | None = ""
    dateOfBirth: str | None = None
    sex: str | None = None
    dementiaLikelihood: str | None = None
    notes: str | None = ""
    tests: list[Test] | None = None

class Physician(BaseModel):
    PK: str | None = None
    SK: str | None = None
    clinicName: str | None = None
    companyEmail: str | None = None
    companyNumber: str | None = ""
    oldEmail: str | None = None
    email: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    phoneNumber: str | None = ""
    securityLevel: int | None = None
    specialty: str | None = ""

class Admin(BaseModel):
    PK: str | None = None
    SK: str | None = None
    oldEmail: str | None = None
    companyEmail: str | None = None
    clinicName: str | None = None
    companyNumber: str | None = ""
    securityLevel: int | None = None

class Individual(BaseModel):
    PK: str | None = None
    SK: str | None = None
    companyEmail: str | None = None
    companyNumber: str | None = ""
    oldEmail: str | None = None
    email: str | None = None
    securityLevel: int | None = None
    firstName: str | None = None
    lastName: str | None = None
    clinicName: str | None = None
    specialty: str | None = ""

class PatientMessage(BaseModel):
    PK: str
    SK: str
    physicianName: str
    subject: str
    message: str
    sendMethod: str
    testId: str


# Checks that the token associated with the currently logged in user is valid.
def verify_user(tokenExp):
    current_time = time.time()
    if (int(current_time) <= int(tokenExp)):
        return True
    else:
        return False



@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    with open('static/index.html') as f:
        html = f.read()
    return HTMLResponse(content=html, status_code=200)

@app.get("/{index}", response_class=HTMLResponse)
async def index(request: Request):
    with open('static/index.html') as f:
        html = f.read()
    return HTMLResponse(content=html, status_code=200)

# Returns the user associated with the provided email.
@app.get("/user/{email}")
async def get_user(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']


    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 3 and email == tokenEmail):
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        return response

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json")  

# Returns an individual in the database with the provided partition key and sort key.
@app.get("/{PK}/{PID}/{SK}/{SID}")
async def get_specific(PK, PID, SK, SID, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 3):
        response = table.get_item(
            Key={
                'PK': PK + '#' + PID,
                'SK': SK + '#' + SID
            }
        )
        return response

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Checks whether or not the provided email is already in use.
@app.get("/checkEmail/{email}")
async def check_email(email):
    emailResults = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(email.lower())
    )

    if len(emailResults["Items"]) == 0:
        response = '{"message": "Used email is unique", "success": "true"}'

    else:
        response = '{"message": "Used email already exists", "success": "false"}'

    return Response(content=response, media_type="application/json")

    response = '{"message": "Invalid credentials", "success": "false"}'
    return   Response(content=response, media_type="application/json") 

# Updates the email of a user if the new email is not already in use, otherwise returns an error.
@app.get("/checkUpdatedEmail/{currentEmail}/{newEmail}")
async def check_email(currentEmail, newEmail, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 3 and currentEmail == tokenEmail):
        newEmailResults = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(newEmail.lower())
        )

        myEmailResults = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(currentEmail.lower())
        )

        if len(newEmailResults["Items"]) == 0:
            response = '{"message": "Used email is unique", "success": "true"}'
            
        elif len(newEmailResults["Items"]) > 0:
            otherSK = newEmailResults['Items'][0]['SK']
            mySK = myEmailResults['Items'][0]['SK']
            if mySK == otherSK:
                response = '{"message": "Used email is unique", "success": "true"}'
                return Response(content=response, media_type="application/json")

            else: 
                response = '{"message": "Used email already exists1", "success": "false"}'
                return Response(content=response, media_type="application/json")

        else:
            response = '{"message": "Used email already exists2", "success": "false"}'

        return Response(content=response, media_type="application/json")

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 
    
# Creates a new admin user in DynamoDB.
@app.post("/newAdmin")
async def new_admin(admin: Admin):
    adminResults = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(admin.companyEmail.lower())
    )

    if len(adminResults["Items"]) == 0:
        table.put_item(
            Item={
                'PK': admin.PK,
                'SK': admin.SK,
                'companyEmail': admin.companyEmail,
                'clinicName': admin.clinicName,
                'companyNumber': admin.companyNumber,
                'securityLevel': admin.securityLevel,
                'email': admin.companyEmail,
                'phoneNumber': admin.companyNumber
            },
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")
    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")

# Updates the information of an admin user in DynamoDB. 
@app.post("/updateAdmin")
async def update_admin(admin: Admin):
    myCompany = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(admin.oldEmail.lower())
    )
    adminUpdate = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(admin.companyEmail.lower())
    )

    PK = myCompany['Items'][0]['PK']
    SK = myCompany['Items'][0]['SK']

    physicians = table.scan(
        FilterExpression=Attr('PK').eq(PK) & Attr('SK').contains("USER")
    )

    for i in range(len(physicians['Items'])):
        physicianPK = physicians["Items"][i]['PK']
        physicianSK = physicians["Items"][i]['SK']
        table.update_item(
        Key={
            'PK': physicianPK,
            'SK': physicianSK
        },
        UpdateExpression='SET companyEmail = :val1, clinicName = :val2, companyNumber = :val3',
        ExpressionAttributeValues={
        ':val1': admin.companyEmail,
        ':val2': admin.clinicName,
        ':val3': admin.companyNumber
        }
    )
    
    if len(adminUpdate["Items"]) == 0:
        table.update_item(
            Key={
                'PK': PK,
                'SK': SK
            },
            UpdateExpression='SET companyEmail = :val1, email = :val2, clinicName = :val3, companyNumber = :val4, phoneNumber = :val5',
            ExpressionAttributeValues={
            ':val1': admin.companyEmail,
            ':val2': admin.companyEmail,
            ':val3': admin.clinicName,
            ':val4': admin.companyNumber,
            ':val5': admin.companyNumber
            }
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")

    
    elif len(adminUpdate["Items"]) > 0:
        otherSK = adminUpdate['Items'][0]['SK']
        if SK == otherSK:
            table.update_item(
                Key={
                    'PK': PK,
                    'SK': SK
                },
                UpdateExpression='SET companyEmail = :val1, email = :val2, clinicName = :val3, companyNumber = :val4, phoneNumber = :val5',
                ExpressionAttributeValues={
                ':val1': admin.companyEmail,
                ':val2': admin.companyEmail,
                ':val3': admin.clinicName,
                ':val4': admin.companyNumber,
                ':val5': admin.companyNumber
                }
            )
            response = '{"message": "Used email is unique", "success": "true"}'
            return Response(content=response, media_type="application/json")

        else: 
            response = '{"message": "Used email already exists", "success": "false"}'
            return Response(content=response, media_type="application/json")

    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")

#  
@app.get("/deleteCustomer/{email}")
async def delete_customer(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )
        stripe.Customer.delete(
            "%s" % (currentCustomer.data[0].id)
        )
    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Deletes an admin user from DynamoDB. This will also delete all the physicians under them and all the patients under the physicians.
@app.post("/deleteAdmin")
async def delete_physician(admin: Admin):
    admin = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(admin.companyEmail)
    )

    PK = admin['Items'][0]['PK']
    SK = admin['Items'][0]['SK']

    table.delete_item(
        Key={
            'PK': PK,
            'SK': SK
        }
    )

    physicians = table.scan(
        FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("USER")
    )

    for i in range(len(physicians['Items'])):
        physicianPK = physicians["Items"][i]['PK']
        physicianSK = physicians["Items"][i]['SK']

        patients = table.scan(
            FilterExpression=Attr('PK').eq(physicianSK) & Attr('SK').contains("PATI")
        )
        
        for i in range(len(patients["Items"])):
            patientPK = patients["Items"][i]['PK']
            patientSK = patients["Items"][i]['SK']
            table.delete_item(
                Key={
                    'PK': patientPK,
                    'SK': patientSK
                }
            )

        physicianUsername = cognito.list_users(
            UserPoolId='us-east-2_tZIGe1Zgs',
            AttributesToGet=[
                'sub',
            ],
            Filter="email='%s'" % (physicians["Items"][i]['email'])
        )
        response = cognito.admin_delete_user(
            UserPoolId='us-east-2_tZIGe1Zgs',
            Username=physicianUsername['Users'][0]['Username']
        )
        table.delete_item(
            Key={
                'PK': physicianPK,
                'SK': physicianSK
            }
        )

    

    # Patient delete test


# Creates a new user in DynamoDB.
@app.post("/newIndividual")
async def new_individual(individual: Individual):
    individualResults = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(individual.companyEmail.lower())
    )

    if len(individualResults["Items"]) == 0:
        table.put_item(
            Item={
                'PK': individual.PK,
                'SK': individual.SK,
                'firstName': individual.firstName,
                'lastName': individual.lastName,
                'clinicName': individual.clinicName,
                'specialty': individual.specialty,
                'email': individual.companyEmail,
                'phoneNumber': individual.companyNumber,
                'companyEmail': individual.companyEmail,
                'companyNumber': individual.companyNumber,
                'securityLevel': individual.securityLevel
            }
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")
    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")

# Updates the information of a user in DynamoDB.
@app.post("/updateIndividual")
async def update_individual(individual: Individual):
    myIndividual = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(individual.oldEmail.lower())
    )
    individualUpdate = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(individual.companyEmail.lower())
    )

    PK = myIndividual['Items'][0]['PK']
    SK = myIndividual['Items'][0]['SK']

    patients = table.scan(
        FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
    )

    for i in range(len(patients['Items'])):
        patientPK = patients["Items"][i]['PK']
        patientSK = patients["Items"][i]['SK']
        table.update_item(
        Key={
            'PK': patientPK,
            'SK': patientSK
        },
        UpdateExpression='SET physicianEmail = :val1',
        ExpressionAttributeValues={
        ':val1': individual.companyEmail
        }
    )

    if len(individualUpdate["Items"]) == 0:
        table.update_item(
            Key={
                'PK': PK,
                'SK': SK
            },
            UpdateExpression='SET firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, specialty = :val5, clinicName = :val6, companyEmail = :val7, companyNumber = :val8',
            ExpressionAttributeValues={
            ':val1': individual.firstName,
            ':val2': individual.lastName,
            ':val3': individual.companyEmail,
            ':val4': individual.companyNumber,
            ':val5': individual.specialty,
            ':val6': individual.clinicName,
            ':val7': individual.companyEmail,
            ':val8': individual.companyNumber
            }
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")

    elif len(individualUpdate["Items"]) > 0:
        otherSK = individualUpdate['Items'][0]['SK']
        if SK == otherSK:
            table.update_item(
                Key={
                    'PK': PK,
                    'SK': SK
                },
                UpdateExpression='SET firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, specialty = :val5, clinicName = :val6, companyEmail = :val7, companyNumber = :val8',
                ExpressionAttributeValues={
                ':val1': individual.firstName,
                ':val2': individual.lastName,
                ':val3': individual.companyEmail,
                ':val4': individual.companyNumber,
                ':val5': individual.specialty,
                ':val6': individual.clinicName,
                ':val7': individual.companyEmail,
                ':val8': individual.companyNumber
                }         
            )
            response = '{"message": "Used email is unique", "success": "true"}'
            return Response(content=response, media_type="application/json")

        else: 
            response = '{"message": "Used email already exists", "success": "false"}'
            return Response(content=response, media_type="application/json")

    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")
        
# Deletes a user from DynamoDB. This will also delete all the physicians under them.
@app.post("/deleteIndividual")
async def delete_physician(individual: Individual):
    individual = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(individual.companyEmail)
    )

    PK = individual['Items'][0]['PK']
    SK = individual['Items'][0]['SK']

    table.delete_item(
        Key={
            'PK': PK,
            'SK': SK
        }
    )

    patients = table.scan(
        FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
    )
    # )\docs\api\events

    for i in range(len(patients['Items'])):
        patientPK = patients["Items"][i]['PK']
        patientSK = patients["Items"][i]['SK']
        table.delete_item(
        Key={
            'PK': patientPK,
            'SK': patientSK
        }
    )


# Creates a new physician in DynamoDB, associated with the currently logged in admin.
@app.post("/newPhysician")
async def new_physician(physician: Physician):
    physicianResults = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(physician.email)
    )

    if len(physicianResults["Items"]) == 0:
        table.put_item(
            Item={
                'PK': physician.PK,
                'SK': physician.SK,
                'clinicName': physician.clinicName,
                'companyEmail': physician.companyEmail,
                'companyNumber': physician.companyNumber,
                'email': physician.email,
                'firstName': physician.firstName,
                'lastName': physician.lastName,
                'phoneNumber': physician.phoneNumber,
                'securityLevel': physician.securityLevel,
                'specialty': physician.specialty
            },
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")
    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")
    
# Updates the information of a physician in DynamoDB.
@app.post("/updatePhysician")
async def update_physician(physician: Physician):
    myPhysician = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(physician.oldEmail.lower())
    )
    physicianUpdate = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(physician.email.lower())
    )

    PK = myPhysician['Items'][0]['PK']
    SK = myPhysician['Items'][0]['SK']

    patients = table.scan(
        FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
    )

    for i in range(len(patients['Items'])):
        patientPK = patients["Items"][i]['PK']
        patientSK = patients["Items"][i]['SK']
        table.update_item(
        Key={
            'PK': patientPK,
            'SK': patientSK
        },
        UpdateExpression='SET physicianEmail = :val1',
        ExpressionAttributeValues={
        ':val1': physician.email
        }
    )

    if len(physicianUpdate["Items"]) == 0:
        table.update_item(
            Key={
                'PK': PK,
                'SK': SK
            },
            UpdateExpression='SET firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, specialty = :val5',
            ExpressionAttributeValues={
            ':val1': physician.firstName,
            ':val2': physician.lastName,
            ':val3': physician.email,
            ':val4': physician.phoneNumber,
            ':val5': physician.specialty
            }
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")

    elif len(physicianUpdate["Items"]) > 0:
        otherSK = physicianUpdate['Items'][0]['SK']
        if SK == otherSK:
            table.update_item(
                Key={
                    'PK': PK,
                    'SK': SK
                },
                UpdateExpression='SET firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, specialty = :val5',
                ExpressionAttributeValues={
                ':val1': physician.firstName,
                ':val2': physician.lastName,
                ':val3': physician.email,
                ':val4': physician.phoneNumber,
                ':val5': physician.specialty
                }
            )
            response = '{"message": "Used email is unique", "success": "true"}'
            return Response(content=response, media_type="application/json")

        else: 
            response = '{"message": "Used email already exists", "success": "false"}'
            return Response(content=response, media_type="application/json")

    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")

# Returns all the physicians under the account the provided email belongs to.  
@app.get("/physicians/{email}")
async def get_physicians(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel == 0 and email == tokenEmail):
        company = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        PK = company['Items'][0]['PK']

        response = table.scan(
            FilterExpression=Attr('PK').eq(PK) & Attr('SK').contains("USER")
        )

        return response

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Deletes a physician from DynamoDB. This will also delete all the patients under them.
@app.post("/deletePhysician")
async def delete_physician(physician: Physician):
    physician = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(physician.email)
    )

    PK = physician['Items'][0]['PK']
    SK = physician['Items'][0]['SK']

    table.delete_item(
        Key={
            'PK': PK,
            'SK': SK
        }
    )

    patients = table.scan(
        FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
    )

    for i in range(len(patients['Items'])):
        patientPK = patients["Items"][i]['PK']
        patientSK = patients["Items"][i]['SK']
        table.delete_item(
        Key={
            'PK': patientPK,
            'SK': patientSK
        }
    )

# Locks or unlocks the account of a physician.
@app.post("/lockPhysician")
async def lock_physician(physician: Physician):
    oldSecurityLevel = physician.securityLevel
    newSecurityLevel = 2 if oldSecurityLevel == 3 else 3
    physician = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(physician.email)
    )

    PK = physician['Items'][0]['PK']
    SK = physician['Items'][0]['SK']

    table.update_item(
        Key={
            'PK': PK,
            'SK': SK
        },
        UpdateExpression='SET securityLevel = :val1',
        ExpressionAttributeValues={
        ':val1': newSecurityLevel
        }
    )



# Creates a new patient in DynamoDB, associated with the currently logged in physician.
@app.post("/newPatient")
async def new_patient(patient: Patient):
    patientResults = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(patient.email)
    )

    if len(patientResults["Items"]) == 0:
        table.put_item(
            Item={
                'PK': patient.PK,
                'SK': patient.SK,
                'physicianEmail': patient.physicianEmail,
                'firstName': patient.firstName,
                'lastName': patient.lastName,
                'email': patient.email, 
                'phoneNumber': patient.phoneNumber,
                'dateOfBirth': patient.dateOfBirth,
                'sex': patient.sex,
                'dementiaLikelihood': patient.dementiaLikelihood,
                'notes': patient.notes,
                'tests': []
            },
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")
    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")

# Updates the information of a patient in DynamoDB.
@app.post("/updatePatient")
async def update_patient(patient: Patient):
    myPatient = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(patient.oldEmail.lower())
    )
    patientUpdate = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(patient.email.lower())
    )

    PK = myPatient['Items'][0]['PK']
    SK = myPatient['Items'][0]['SK']

    if len(patientUpdate["Items"]) == 0:
        table.update_item(
            Key={
                'PK': PK,
                'SK': SK
            },
            UpdateExpression ='Set firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, dateOfBirth = :val5, sex = :val6, dementiaLikelihood = :val7, notes = :val8',
            ExpressionAttributeValues={
            ':val1': patient.firstName,
            ':val2': patient.lastName,
            ':val3': patient.email,
            ':val4': patient.phoneNumber,
            ':val5': patient.dateOfBirth,
            ':val6': patient.sex,
            ':val7': patient.dementiaLikelihood,
            ':val8': patient.notes
            }
        )
        response = '{"message": "Used email is unique", "success": "true"}'
        return Response(content=response, media_type="application/json")

    elif len(patientUpdate["Items"]) > 0:
        otherSK = patientUpdate['Items'][0]['SK']
        if SK == otherSK:
            table.update_item(
                Key={
                    'PK': PK,
                    'SK': SK
                },
                UpdateExpression ='Set firstName = :val1, lastName = :val2, email = :val3, phoneNumber = :val4, dateOfBirth = :val5, sex = :val6, dementiaLikelihood = :val7, notes = :val8',
                ExpressionAttributeValues={
                ':val1': patient.firstName,
                ':val2': patient.lastName,
                ':val3': patient.email,
                ':val4': patient.phoneNumber,
                ':val5': patient.dateOfBirth,
                ':val6': patient.sex,
                ':val7': patient.dementiaLikelihood,
                ':val8': patient.notes
                }
            )
            response = '{"message": "Used email is unique", "success": "true"}'
            return Response(content=response, media_type="application/json")

        else: 
            response = '{"message": "Used email already exists", "success": "false"}'
            return Response(content=response, media_type="application/json")

    else:
        response = '{"message": "Used email already exists", "success": "false"}'
        return Response(content=response, media_type="application/json")
        


# Returns all the patients under the account the provided email belongs to.  
@app.get("/patients/{email}")
async def get_patients(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and (securityLevel == 1 or securityLevel == 2) and email == tokenEmail):
        physician = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        SK = physician['Items'][0]['SK']

        patients = table.scan(
            FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
        )
        
        return patients

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Returns all the physicians under the account the provided email belongs to if they match the search.
@app.get("/searchPhysicians/{email}/{search}")
async def get_physicians(email, search, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel == 0 and email == tokenEmail):
        company = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        PK = company['Items'][0]['PK']
        physicians = table.scan(
            FilterExpression=Attr('PK').eq(PK) & Attr('SK').contains("USER")
        )

        searchResults = []

        for i in range(len(physicians['Items'])):
            fullName = physicians["Items"][i]['firstName'].lower() + " " + physicians["Items"][i]['lastName'].lower()
            if (fullName in search.lower()) or (search.lower() in fullName) or (search.lower() in physicians["Items"][i]['email'].lower()) or (physicians["Items"][i]['email'].lower() in search.lower()):
                searchResults.append(physicians["Items"][i])
            # if search != "":
            #     physician = table.scan(
            #         FilterExpression=Attr('PK').eq(PK) & Attr('SK').contains("USER") & (Attr('firstName').contains(search) | Attr('lastName').contains(search) | Attr('specialty').contains(search) | Attr('email').contains(search.lower()))
            #     )
            #     print(physician)
            #     searchResults = physician["Items"]
            
            # elif search == "":
            #     physician = table.scan(
            #     FilterExpression=Attr('PK').eq(PK) & Attr('SK').contains("USER")
            #     )

        return searchResults

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 
    
# Returns all the patients under the account the provided email belongs to if they match the search.
@app.get("/searchPatients/{email}/{search}")
async def get_patients(email, search, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel == 1 or securityLevel == 2 and email == tokenEmail):
        physician = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        SK = physician['Items'][0]['SK']
        patients = table.scan(
            FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
        )

        searchResults = []
        
        for i in range(len(patients['Items'])):
            fullName = patients["Items"][i]['firstName'].lower() + " " + patients["Items"][i]['lastName'].lower()
            if (fullName in search.lower()) or (search.lower() in fullName):
                searchResults.append(patients["Items"][i])
        
        return searchResults

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 
  
# Returns all the patients under the account the provided email belongs to if they are caught by the filters.
@app.get("/filteredPatients/{email}/{dementiaLikelihood}/{sex}/{ageMin}/{ageMax}")
async def get_patients(email, dementiaLikelihood, sex, ageMin, ageMax, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel == 1 or securityLevel == 2 and email == tokenEmail):
        today = date.today()
        physician = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        SK = physician['Items'][0]['SK']

        if sex == "empty" and ageMax == "empty" and dementiaLikelihood != "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('dementiaLikelihood').eq(dementiaLikelihood)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge):
                    filteredPatients.append(patients["Items"][i])

        elif sex == "empty" and ageMax != "empty" and dementiaLikelihood != "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('dementiaLikelihood').eq(dementiaLikelihood)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge <= int(ageMax)):
                    filteredPatients.append(patients["Items"][i])

        elif sex == "empty" and ageMax != "empty" and dementiaLikelihood == "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI")
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge <= int(ageMax)):
                    filteredPatients.append(patients["Items"][i])

        elif ageMax == "empty" and sex != "empty" and dementiaLikelihood != "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('dementiaLikelihood').eq(dementiaLikelihood) & Attr('sex').eq(sex)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge):
                    filteredPatients.append(patients["Items"][i])

        elif ageMax == "empty" and sex != "empty" and dementiaLikelihood == "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('sex').eq(sex)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge):
                    filteredPatients.append(patients["Items"][i])

        elif dementiaLikelihood == "empty" and sex != "empty" and ageMax != "empty":
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('sex').eq(sex)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge <= int(ageMax)):
                    filteredPatients.append(patients["Items"][i])
        
        else:
            patients = table.scan(
                FilterExpression=Attr('PK').eq(SK) & Attr('SK').contains("PATI") & Attr('dementiaLikelihood').eq(dementiaLikelihood)
            )

            filteredPatients = []

            for i in range(len(patients['Items'])):
                patientDateOfBirth = patients["Items"][i]['dateOfBirth']
                born = datetime.strptime(patientDateOfBirth, '%Y-%m-%d').date()
                patientAge = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                if (int(ageMin) <= patientAge <= int(ageMax)):
                    filteredPatients.append(patients["Items"][i])
        
        return filteredPatients

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Deletes a patient from DynamoDB
@app.post("/deletePatient")
async def delete_patient(patient: Patient):
    patient = table.query(
        IndexName='email-index',
        KeyConditionExpression=Key('email').eq(patient.email)
    )

    PK = patient['Items'][0]['PK']
    SK = patient['Items'][0]['SK']

    table.delete_item(
        Key={
            'PK': PK,
            'SK': SK
        }
    )

# Sends an email to a patient with a link for a test. A new test will also be created under this patient in DynamoDB.
@app.post("/sendPatientLinkEmail")
async def send_patient_email(patientMessage: PatientMessage):
    response = table.get_item(
        Key={
            'PK': patientMessage.PK,
            'SK': patientMessage.SK
        }
    )

    toEmail = response["Item"]["email"]

    # Creating an email template and attaching the provided information
    message = MIMEMultipart()
    message['Subject'] = patientMessage.subject
    message['From'] = myEmail
    message['To'] = toEmail
    content = MIMEText(patientMessage.message, 'plain')

    message.attach(content)

    # establising a connection to a server to send an email from
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.ehlo()
    server.login(myEmail, myPassword)

    # sending the email and closing the connection
    server.sendmail(myEmail, toEmail, message.as_string())
    server.quit()

    # adding a new test to the patient who is receiving the link
    currentTests = response['Item']['tests']

    if currentTests == []:
        allTests = [{'result': 'none', 'testId': patientMessage.testId, 'status': 'incomplete', 'dateSent': datetime.today().strftime('%Y-%m-%d')}]
    else:
        allTests = currentTests + [{'result': 'none', 'testId': patientMessage.testId, 'status': 'incomplete', 'dateSent': datetime.today().strftime('%Y-%m-%d')}]

    table.update_item(
        Key={
            'PK' : patientMessage.PK,
            'SK' : patientMessage.SK
        },
        UpdateExpression ='Set tests = :val1',
        ExpressionAttributeValues={
            ':val1': allTests
        }
    )

# Sends a text to a patient with a link for a test. A new test will also be created under this patient in DynamoDB.
@app.post("/sendPatientLinkText")
async def send_patient_text(patientMessage: PatientMessage):
    print(patientMessage.subject)
    print(patientMessage.message)
    print("text")
    response = table.get_item(
        Key={
            'PK': patientMessage.PK,
            'SK': patientMessage.SK
        }
    )

    message = twilio.messages.create(
                     body=patientMessage.message,
                     from_='+15076876479',
                     to=response['Item']['phoneNumber']
                 )

    # adding a new test to the patient who is receiving the link
    currentTests = response['Item']['tests']

    if currentTests == []:
        allTests = [{'result': 'none', 'testId': patientMessage.testId, 'status': 'incomplete', 'dateSent': datetime.today().strftime('%Y-%m-%d')}]
    else:
        allTests = currentTests + [{'result': 'none', 'testId': patientMessage.testId, 'status': 'incomplete', 'dateSent': datetime.today().strftime('%Y-%m-%d')}]

    table.update_item(
        Key={
            'PK' : patientMessage.PK,
            'SK' : patientMessage.SK
        },
        UpdateExpression ='Set tests = :val1',
        ExpressionAttributeValues={
            ':val1': allTests
        }
    )

# Returns a url for the image associated with a test.
@app.get("/getTestResults/{file}")
async def get_test(file, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid):
        fileName = "PATI#" + file
        response = s3_client.generate_presigned_url('get_object',
                                                        Params={'Bucket': 'memorexbucket134102-dev',
                                                                'Key': fileName},
                                                        ExpiresIn=600)

        return response

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Updates the test results of a patient once they have completed the test.
@app.post("/testResults")
async def get_test(testResult: TestResult):
    patient = table.scan(
        FilterExpression=Attr('SK').eq(testResult.patientId)
    )

    updatedTests = []
    
    for i in range(len(patient["Items"][0]["tests"])):
        if patient["Items"][0]["tests"][i]["testId"] == testResult.testId:
            updatedTest = {'result': testResult.result, 'testId': testResult.testId, 'status': 'complete', 'dateSent': patient["Items"][0]["tests"][i]["dateSent"]}
            updatedTests.append(updatedTest)
        else:
            updatedTest.append(patient["Items"][0]["tests"][i])



    table.update_item(
        Key={
            'PK': patient["Items"][0]["PK"],
            'SK': patient["Items"][0]["SK"]
        },
        UpdateExpression ='Set tests = :val1',
        ExpressionAttributeValues={
        ':val1': updatedTests
        }
    )

@app.post("/upload_png")
async def upload_png(file: UploadFile):
    testFileName = "test"
    print("yay")
    print(file.filename)
    s3Bucket.Bucket('memorexbucket134102-dev').upload_fileobj(file.file, Key=testFileName)

    


# Creates a new customer and payment method for an account.
@app.post("/payment")
async def process_payment(payment: Payment):
    print(payment.name)
    try:

        newCustomer = stripe.Customer.create(
            payment_method=payment.id,
            email=payment.email,
            invoice_settings={"default_payment_method": payment.id},
            name=payment.name
        )
        newSub=""
        if(payment.subId == '1'):
            newSub = stripe.Subscription.create(
                customer=newCustomer,
                items=[{"price": "price_1MtB2YAB1aJ9omUKvqVzgOUo"}],
                metadata={"customer": newCustomer.id}
            )
        elif(payment.subId == '2'):
            newSub = stripe.Subscription.create(
                customer=newCustomer,
                items=[{"price": "price_1MtB75AB1aJ9omUKdt0ReJ2q"}],
                metadata={"customer": newCustomer.id}
            )
        elif(payment.subId == '3'):
            newSub = stripe.Subscription.create(
                customer=newCustomer,
                items=[{"price": "price_1MtB7QAB1aJ9omUKehQkMT0U"}],
                metadata={"customer": newCustomer.id}
            )
            
        print(newSub)
        stripe.SubscriptionSchedule.create(
                from_subscription = "%s" % (newSub.id)
        )
        
            

        response = '{"message": "Payment successful", "success": "true"}'
        return Response(content=response, media_type="application/json")
    except: 
        response = '{"message": "Payment failed", "success": "false"}'
        return Response(content=response, media_type="application/json")

#Takes the email of the current user to find what payment methods or cards are linked to the user.
@app.get("/showPayment/{email}")
async def get_payment(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )

        #Stripe method used to list the current customer's cards.
        card = stripe.PaymentMethod.list(
            customer="%s" % (currentCustomer.data[0].id),
            type="card"
        )
        return card

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

#Takes the email of the current user to get Customer information.
@app.get("/showCustomer/{email}")
async def get_customer(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )
        
        #returns the Customer object.
        return currentCustomer

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

#Method to add a new card or payment method for a user.
@app.post("/addPaymentMethod")
async def add_payment(payment: Payment):

    #Stripe method used to search for the customer(user) id using their email.
    currentCustomer = stripe.Customer.search(
        query="email: '%s'" % (payment.email)
    )

    #Stripe method used to attach the card created to the user.
    stripe.PaymentMethod.attach(
        "%s" % (payment.id),
        customer = "%s" % (currentCustomer.data[0].id)
    )

    #Stripe method used to modify customer data.
    stripe.Customer.modify(
        "%s" % (currentCustomer.data[0].id),
        invoice_settings={"default_payment_method": "%s" % (payment.id)},
    )

#The email of the current user is taken as well as the payment or card id that was selected.
@app.get("/setDefaultCard/{email}/{paymentId}")
async def set_default(email, paymentId, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email: '%s'" % (email)
        )

        #Stripe method used to modify customer data.
        stripe.Customer.modify(
            "%s" % (currentCustomer.data[0].id),
            invoice_settings={"default_payment_method": "%s" % (paymentId)},
        )

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

#The card id is taken to delete the card object.
@app.get("/deletePaymentMethod/{cardId}")
async def delete_payment(cardId, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2):

        #Stripe method called to detach a card from a user, deleting it.
        deleteCard=stripe.PaymentMethod.detach(
            "%s" % (cardId)
        )
        return deleteCard

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

# Returns true if the user associated with the provided email does not have a valid subscription.
@app.get("/subscription/{email}")
async def get_subscription(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and email == tokenEmail):
        user = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )

        companyEmail = user['Items'][0]['companyEmail']
        myQuery = "email:'%s'" % (companyEmail)
        my_customer = stripe.Customer.search(query=myQuery)

        if my_customer.data == []:
            return(True)

        else: 
            return(my_customer.data[0].delinquent)

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

#Takes the email of the current user as well as the type of subscription chosen, used to update the ongoing subscription.
@app.get("/updateSubscription/{email}/{subId}")
async def update_subscription(email, subId, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )

        #Stripe method used to search for any subscription linked to the customer id.
        #Only one is returned because a customer can only have 1 subscription.
        currentSubscription = stripe.Subscription.search(
            query = "metadata['customer']:'%s'" % (currentCustomer.data[0].id)
        )

        #Stripe method used to find a list of subscription items for a subscription.
        #Only one is returned because a subscription only has 1 subscription item.
        # currentSubItem = stripe.SubscriptionItem.list(
        #     subscription= "%s" % (currentSubscription.data[0].id)
        # )
        subSched = stripe.SubscriptionSchedule.list(
            customer = "%s" % (currentCustomer.data[0].id)
        )

        mySubSched =  stripe.SubscriptionSchedule.retrieve(
            "%s" % (subSched.data[0].id)
        )
        # print(mySubSched)

        # print(len(subSched))

        # if(len(subSched) == 0):
        #     stripe.SubscriptionSchedule.create(
        #         from_subscription = "%s" % (currentSubscription.data[0].id)
        #     )

        subType = ""

        if(subId == '1'):
            subType="price_1MtB2YAB1aJ9omUKvqVzgOUo"
            stripe.SubscriptionSchedule.modify(
                "%s" % (subSched.data[0].id),
                phases = [
                    {
                    "start_date" : subSched.data[0].phases[0].start_date,
                    "end_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        subSched.data[0].phases[0]['items'][0].price,
                        },
                    ],
                    },
                    {
                    "start_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        "price_1MtB2YAB1aJ9omUKvqVzgOUo",
                        },
                    ],
                    },
            ],
            )
        elif(subId == '2'):
            subType = "price_1MtB75AB1aJ9omUKdt0ReJ2q"
            stripe.SubscriptionSchedule.modify(
                "%s" % (subSched.data[0].id),
                phases = [
                    {
                    "start_date" : subSched.data[0].phases[0].start_date,
                    "end_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        subSched.data[0].phases[0]['items'][0].price,
                        },
                    ],
                    },
                    {
                    "start_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        "price_1MtB75AB1aJ9omUKdt0ReJ2q",
                        },
                    ],
                    },
            ],
            )
        elif(subId == '3'):
            subType = "price_1MtB7QAB1aJ9omUKehQkMT0U"
            stripe.SubscriptionSchedule.modify(
                "%s" % (subSched.data[0].id),
                phases = [
                    {
                    "start_date" : subSched.data[0].phases[0].start_date,
                    "end_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        subSched.data[0].phases[0]['items'][0].price,
                        },
                    ],
                    },
                    {
                    "start_date" : subSched.data[0].phases[0].end_date,
                    "items": [
                        {
                        "price":
                        "price_1MtB7QAB1aJ9omUKehQkMT0U",
                        },
                    ],
                    },
            ],
            )
        return subType
        #returns a subscription item object.
        # return currentSubscription.data[0].current_period_end
        # print(currentSubscription.data[0].current_period_end)

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

#Takes the email of the current user so that a subscription linked to that user can be deleted.
@app.get("/deleteSubscription/{email}")
async def delete_subscription(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )

        #Stripe method used to search for any subscription linked to the customer id.
        #Only one is returned because a customer can only have 1 subscription.
        currentSubscription = stripe.Subscription.search(
            query = "metadata['customer']:'%s'" % (currentCustomer.data[0].id)
        )

        #Stripe method used to modify subscription information.
        stripe.Subscription.modify(
            "%s" % (currentSubscription.data[0].id),
            cancel_at_period_end="true",
        )

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

    
#Takes the email and a button type to return a subscription object or run methods depending on the button that was clicked.
@app.get("/currentSubscription/{email}/{buttonType}")
async def get_subscription(email,buttonType, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 3 and email == tokenEmail):


        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
                query="email:'%s'" % (email)
            )

        subSched = stripe.SubscriptionSchedule.list(
            customer = "%s" % (currentCustomer.data[0].id)
        )
        
        #Stripe method used to search for any subscription linked to the customer id.
        #Only one is returned because a customer can only have 1 subscription.
        currentSubscription = stripe.Subscription.search(
            query = "metadata['customer']:'%s'" % (currentCustomer.data[0].id)
        )

        if(buttonType != ""):
        #     subSched = stripe.SubscriptionSchedule.list(
        #         customer = "%s" % (currentCustomer.data[0].id)
        #     )
        
        # if(len(subSched) == 0):
        #     stripe.SubscriptionSchedule.create(
        #     from_subscription = "%s" % (currentSubscription.data[0].id)
        #     )
            if buttonType == "Cancel":                
                print(subSched.data[0].id)
                print(currentSubscription)
                stripe.SubscriptionSchedule.modify(
                    "%s" % (subSched.data[0].id),
                    phases = [
                        {
                        "start_date" : subSched.data[0].phases[0].start_date,
                        "end_date" : subSched.data[0].phases[0].end_date,
                        "items": [
                            {
                            "price":
                            subSched.data[0].phases[0]['items'][0].price,
                            },
                        ],
                        }
                ],
                    end_behavior= "cancel" 
                )
                # stripe.Subscription.modify(
                #     "%s" % (currentSubscription.data[0].id),
                #     cancel_at_period_end="true",
                # )

                # if(subSched.data[0].status == "active"):
                #     stripe.SubscriptionSchedule.release(
                #     "%s" % (subSched.data[0].id),
                #     )
                #     stripe.SubscriptionSchedule.cancel(
                #     "%s" % (subSched.data[0].id),
                #     )
                #     stripe.Subscription.modify(
                #         "%s" % (currentSubscription.data[0].id),
                #         cancel_at_period_end="true",
                #     )
                # else:
            elif buttonType == "Resume":
                stripe.SubscriptionSchedule.modify(
                    "%s" % (subSched.data[0].id),
                    phases = [
                        {
                        "start_date" : subSched.data[0].phases[0].start_date,
                        "end_date" : subSched.data[0].phases[0].end_date,
                        "items": [
                            {
                            "price":
                            subSched.data[0].phases[0]['items'][0].price,
                            },
                        ],
                        }
                ],
                    end_behavior= "release" 
                )

        #The subscription object is returned.
        return currentSubscription

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 

@app.get("/currentSubscriptionSchedule/{email}/")
async def get_subscription(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 3 and email == tokenEmail):


        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
            query="email:'%s'" % (email)
        )
        subSched = stripe.SubscriptionSchedule.list(
            customer = "%s" % (currentCustomer.data[0].id)
        )

        #The subscription object is returned.
        return subSched

#takes the email of the current user to find which product(subscription) they currently have on stripe.
@app.get("/currentProduct/{email}")
async def current_product(email, idToken):
    myToken: dict = cognitojwt.decode(
        idToken,
        'us-east-2',
        'us-east-2_tZIGe1Zgs',
        app_client_id='3jtm0l02mte04uhs0m1hqmfg7k'
    )

    response = cognito.get_user(
        AccessToken=idToken
    )

    for i in range(len(response['UserAttributes'])):
        if response['UserAttributes'][i]['Name'] == 'custom:securityLevel':
            securityLevel = int(response['UserAttributes'][i]['Value'])
        elif response['UserAttributes'][i]['Name'] == 'email':
            tokenEmail = response['UserAttributes'][i]['Value']

    token_is_valid = verify_user(myToken['exp'])
    if (token_is_valid and securityLevel < 2 and email == tokenEmail):

        #Stripe method used to search for the customer(user) id using their email.
        currentCustomer = stripe.Customer.search(
                    query="email:'%s'" % (email)
                )

        #Stripe method used to search for any subscription linked to the customer id.
        #Only one is returned because a customer can only have 1 subscription.
        currentSubscription = stripe.Subscription.search(
            query = "metadata['customer']:'%s'" % (currentCustomer.data[0].id)
        )
            
        #Stripe method used to find a list of subscription items for a subscription.
        #Only one is returned because a subscription only has 1 subscription item.
        currentSubItem = stripe.SubscriptionItem.list(
            subscription= "%s" % (currentSubscription.data[0].id)
        )

        #Stripe method used to retrieve the product related to the subscription item.
        currentProduct = stripe.Product.retrieve(
            "%s" % (currentSubItem.data[0].price.product)
        )

    else:
        response = '{"message": "Invalid credentials", "success": "false"}'
        return   Response(content=response, media_type="application/json") 
 
    #The product is returned.
    return currentProduct