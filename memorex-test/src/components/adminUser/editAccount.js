import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate} from "react-router-dom";
import classes from "../account.module.css";
import { FormGroup, FormControl } from "react-bootstrap";
import { useFormFields } from "../../lib/hooksLib";
import "./editdesign.css";
import {MDBContainer, MDBInput} from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function EditAccount() {
  const [codeSent, setCodeSent] = useState(false);
  const [fields, handleFieldChange] = useFormFields({
    code: "",
  });

  const [error, setError] = useState();
  const [errorPhone, setErrorPhone] = useState();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [account, setAccount] = useState([]);
  const [oldEmail, setOldEmail] = useState();
  const [show, setShow] = useState(false);
  const [display1, setDisplay1] = useState({ display: "none" });

  const AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: "AKIAX3FHVXYSIVRBPHGJ",
    secretAccessKey: "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",
    region: "us-east-2",
  });

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
    setOldEmail(session.idToken.payload.email);
  }

  //This will check if the input for code is greater than 0
  function validateConfirmForm() {
    return fields.code.length > 0;
  }

  async function onUpdate(event) {
    event.preventDefault();
    const session = await Auth.currentSession();
    let sanitizedPhoneNum = "";

    setIsSendingCode(true);
    const user = await Auth.currentAuthenticatedUser();

    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    if (account.companyNumber !== "") {
      sanitizedPhoneNum = "+" + account.companyNumber.replace(/\D/g, "");
    }
    let response = await axios.get(`/checkUpdatedEmail/${oldEmail}/${account.companyEmail}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    let regPhoneNum = /^[+]\d{10}$/;
    //For statement to delete red input border
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    setError();
    setErrorPhone();

    if (account.clinicName === "") {
      document.getElementById("clinicName").classList.add("is-danger");
    } else if (account.companyNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setErrorPhone("Please enter a valid phone number.");
      document.getElementById("phone_number").classList.add("is-danger");
    } else if (account.companyEmail === "") {
      document.getElementById("email").classList.add("is-danger");
    } else if (!account.companyEmail.match(regEmail)) {
      setError("Please enter a valid email address");
      document.getElementById("email").classList.add("is-danger");
    } else if (response.data.success === "false") {
      setError("Email is already in use!");
      document.getElementById("email").classList.add("is-danger");
    } else if (user.attributes.email === account.companyEmail) {
      await Auth.updateUserAttributes(user, { phone_number: sanitizedPhoneNum });
      const response = await axios.post("/updateAdmin", {
        oldEmail,
        companyEmail: account.companyEmail,
        clinicName: account.clinicName,
        companyNumber: sanitizedPhoneNum,
      });
      navigate("/adminAccount");
    } else {
      try {
        const user = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(user, { email: account.companyEmail });
        setCodeSent(true);
        // updateAttributes();
      } catch (error) {
        setIsSendingCode(false);
      }
    }
  }
  
  async function handleConfirm(event) {
    event.preventDefault();
    setIsConfirming(true);
    let sanitizedPhoneNum = "+" + account.companyNumber.replace(/\D/g, "");
    try {
      await Auth.verifyCurrentUserAttributeSubmit("email", fields.code);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, { phone_number: sanitizedPhoneNum });
      const response = await axios.post("/updateAdmin", {
        oldEmail,
        companyEmail: account.companyEmail,
        clinicName: account.clinicName,
        companyNumber: sanitizedPhoneNum,
      });
      Auth.signOut();
      alert("Email updated successfully. Please sign in again.");
      navigate("/");
    } catch (error) {
      setError("Wrong confirmation code");
      setIsConfirming(false);
    }
  }

  //It triggers by pressing the enter key
  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("buttons").click();
    }
  };

  //It triggers by pressing the enter key for confirmation
  const handleKeypress2 = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("buttonsConfirm").click();
    }
  };

  const handleChange = (e) => {
    setAccount({
      ...account,
      [e.target.name]: e.target.value,
    });
  };

  function handleDelete(e) {
    e.preventDefault();
    setShow(true);
  }

  async function deleteCurrentUser() {
    setDisplay1({ display: "inline" });
    const session = await Auth.currentSession();
      await axios.get(`/deleteCustomer/${session.idToken.payload.email}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
      Auth.currentAuthenticatedUser()
        .then((user) => {
          const userId = user.attributes.sub;
          const email = user.attributes.email;
          axios({
            method: "post",
            url: "/deleteAdmin",
            data: JSON.stringify({
              companyEmail: email,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          return Auth.deleteUser(userId);
        });
      navigate("/");
    
  }

  const handleClose = () => setShow(false);

  //In this form users will enter new value for the
  //fields they want to update
  function updatePage() {
    return (
      <MDBContainer className=" p-5  #6D757D">
        <div className={classes.editAccountForm}>
          <form onSubmit={onUpdate}>
            <fieldset>
              <div>
                <label htmlFor="clinicName">Clinic Name</label>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="text"
                  id="clinicName"
                  name="clinicName"
                  className="input"
                  required
                  value={account.clinicName}
                  onChange={handleChange}
                  onKeyDown={handleKeypress}
                />
              </div>
              <div>
                <label htmlFor="companyNumber">Phone Number</label>
                <div>{errorPhone && <h1 className="error">{errorPhone}</h1>}</div>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="phone_number"
                  id="phone_number"
                  name="companyNumber"
                  className="input"
                  value={account.companyNumber}
                  onChange={handleChange}
                  onKeyDown={handleKeypress}
                />
              </div>
              <div>
                <label htmlFor="companyEmail">Email Address</label>
                <div>{error && <h1 className="error">{error}</h1>}</div>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="email"
                  id="email"
                  name="companyEmail"
                  className="input"
                  required
                  value={account.companyEmail}
                  onChange={handleChange}
                  onKeyDown={handleKeypress}
                />
              </div>
              <div className="centered-buttons">
                <button class="btn btn-primary" id="buttons" type="update" isLoading={isSendingCode}>
                  Update account
                </button>
                <button class="btn btn-primary" id="buttons" type="update" onClick={(e) => handleDelete(e)}>
                  Delete Account
                </button>
              </div>
            </fieldset>
          </form>
        </div>
        <div className="Modal" style={display1}>
            <Modal show={show} onHide={handleClose}>
              <div>
                <div>
                  <Modal.Header>
                    <Modal.Title>Delete your account?</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <p>Are you sure you want to delete this Account?</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      No
                    </Button>
                    <Button variant="primary" onClick={deleteCurrentUser}>
                      Yes
                    </Button>
                  </Modal.Footer>
                </div>
              </div>
            </Modal>
          </div>
      </MDBContainer>
    );
  }

  //In this form the user will enter the confirmation code
  function renderConfirmationForm() {
    return (
      <form onSubmit={handleConfirm}>
        <FormGroup controlId="code">
          <label>Confirmation Code</label>
          <div>{error && <h1 className="error">{error}</h1>}</div>
          <FormControl
            autoFocus
            type="tel"
            value={fields.code}
            onChange={handleFieldChange}
            onKeyDown={handleKeypress2}
          />
        </FormGroup>
        <button block type="submit" id="buttonsConfirm" isLoading={isConfirming} disabled={!validateConfirmForm()}>
          Confirm
        </button>
      </form>
    );
  }

  return <div className="ChangeEmail">{!codeSent ? updatePage() : renderConfirmationForm()}</div>;
}


