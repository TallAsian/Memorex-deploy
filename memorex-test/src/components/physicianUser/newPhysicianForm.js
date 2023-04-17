import React from "react";
import classes from "../newUser.module.css";
import { ulid } from "ulid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useState, useEffect } from "react";
import { MDBContainer, MDBInput } from "mdb-react-ui-kit";
export default function NewPhysicianForm() {
  const initialFormState = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    specialty: "",
    formType: "createPhysician",
    clinicName: "",
  };

  const AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: "AKIAX3FHVXYSIVRBPHGJ",
    secretAccessKey: "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",
    region: "us-east-2",
  });
  const [formState, updateFormState] = useState(initialFormState);
  const [account, setAccount] = useState([]);
  const userUlid = "USER#" + ulid();
  const { formType } = formState;
  const [error, setError] = useState();
  const [errorPhone, setErrorPhone] = useState();

  let navigate = useNavigate();
  useEffect(() => {
    getSession();
  }, []);

  async function getSession() {
    try {
      const session = await Auth.currentSession();
    } catch {
      let path = "/accessDenied";
      navigate(path);
    }
    const session = await Auth.currentSession();
    const accountResponse = await axios.get(`/user/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setAccount(accountResponse.data.Items[0]);
  }

  function onChange(e) {
    e.persist();
    updateFormState(() => ({ ...formState, [e.target.name]: e.target.value }));
  }

  async function submitPhysician(e) {
    e.preventDefault();
    const { firstName, lastName, email, phoneNumber, specialty } = formState;

    ///Regular expressions for phone number and email
    let sanitizedPhoneNum = "+" + phoneNumber.replace(/\D/g, "");
    let regPhoneNum = /^[+]\d{10}$/;
    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

    setError();
    setErrorPhone();

    //For statement to delete red input border
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    ///If statements for error checking
    if (!firstName) {
      document.getElementById("firstName").classList.add("is-danger");
    } else if (!lastName) {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (!email) {
      setError("Email is required.");
      document.getElementById("email").classList.add("is-danger");
    } else if (!email.match(regEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("email").classList.add("is-danger");
    } else if (phoneNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setErrorPhone("Please enter a valid phone number.");
      document.getElementById("phoneNumber").classList.add("is-danger");
    }
    if (firstName && lastName && ((sanitizedPhoneNum.match(regPhoneNum) || phoneNumber === "") &&(email.match(regEmail)))) {
      try {
        const response = await axios.post("/newPhysician", {
          PK: account.SK,
          SK: userUlid,
          clinicName: account.clinicName,
          companyEmail: account.companyEmail,
          companyNumber: account.companyNumber,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phoneNumber: phoneNumber,
          securityLevel: 2,
          specialty: specialty,
        });
        if (response.data.success === "false") {
          setError("Specified email is already in use.");
          document.getElementById("email").classList.add("is-danger");
        } else {
          if (phoneNumber) {
            var params = {
              UserPoolId: "us-east-2_tZIGe1Zgs",
              Username: email,
              DesiredDeliveryMediums: ["EMAIL"],
              UserAttributes: [
                {
                  Name: "email",
                  Value: email,
                },
                {
                  Name: "phone_number",
                  Value: sanitizedPhoneNum,
                  // Value: phone_number,
                },
                {
                  Name: "custom:securityLevel",
                  Value: "2",
                },
              ],
            };
          } else {
            var params = {
              UserPoolId: "us-east-2_tZIGe1Zgs",
              Username: email,
              DesiredDeliveryMediums: ["EMAIL"],
              UserAttributes: [
                {
                  Name: "email",
                  Value: email,
                },
                {
                  Name: "custom:securityLevel",
                  Value: "2",
                },
              ],
            };
          }

          var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
          // var phone_number = "+" + phoneNumber;
          await cognitoidentityserviceprovider.adminCreateUser(params, function (err, data) {});
          navigate("/adminAccount");
        }
      } catch (exception) {
        if (exception.name === "UsernameExistsException") {
          setError("That email is already in use.");
        }
      }
    }
  }

  //It triggers by pressing the enter key
  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttons").click();
    }
  };

  return (
    <MDBContainer className=" p-5  #6D757D">
    <div>
      <form onSubmit={submitPhysician}>
      {formType === "createPhysician" && (
        <div>
          <div className={classes.newphysicianinputs}>
            <label htmlFor="firstName">First Name</label>
            <MDBInput
              wrapperClass="mb-3"
              size="md"
              type="text"
              id="firstName"
              className="input"
              name="firstName"
              required
              onChange={onChange}
              onKeyDown={handleKeypress}
            />
          </div>
          <div className={classes.newphysicianinputs}>
            <label htmlFor="lastName">Last Name</label>
            <MDBInput
              wrapperClass="mb-3"
              size="md"
              type="text"
              id="lastName"
              className="input"
              name="lastName"
              required
              onChange={onChange}
              onKeyDown={handleKeypress}
            />
          </div>
          <div className={classes.newphysicianinputs}>
            <label htmlFor="email">Email</label>
            {error && <div className="error">{error}</div>}
            <MDBInput
              wrapperClass="mb-3"
              size="md"
              type="email"
              id="email"
              className="input"
              name="email"
              required
              onChange={onChange}
            />
          </div>
          <div className={classes.newphysicianinputs}>
            <label htmlFor="phoneNumber">Phone Number</label>
            {errorPhone && <div className="error">{errorPhone}</div>}
            <MDBInput
              wrapperClass="mb-3"
              size="md"
              type="text"
              id="phoneNumber"
              className="input"
              name="phoneNumber"
              onChange={onChange}
              placeholder="* optional"
              onKeyDown={handleKeypress}
            />
          </div>
          <div className={classes.newphysicianinputs}>
            <label htmlFor="specialty">Specialty</label>
            <MDBInput
              wrapperClass="mb-3"
              size="md"
              type="text"
              id="specialty"
              name="specialty"
              onChange={onChange}
              placeholder="* optional"
              onKeyDown={handleKeypress}
            />
          </div>
            <button class="btn btn-primary anchored-button" type="update" id="buttons" >
              Add Physician
            </button>
        </div>
      )}
      </form>
    </div>
    </MDBContainer>
  );
}
