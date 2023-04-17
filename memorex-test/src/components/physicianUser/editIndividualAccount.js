import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate} from "react-router-dom";
import classes from "../account.module.css";
import { FormGroup, FormControl } from "react-bootstrap";
import { useFormFields } from "../../lib/hooksLib";
import "../adminUser/editdesign.css";
import { MDBContainer,MDBInput } from "mdb-react-ui-kit";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default function EditAccount() {
  const [codeSent, setCodeSent] = useState(false);
  const [fields, handleFieldChange] = useFormFields({
    code: "",
  });

  const [error, setError] = useState();
  const [phoneError, setPhoneError] = useState();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [account, setAccount] = useState([]);
  const [oldEmail, setOldEmail] = useState();
  const [show, setShow] = useState(false);
  const [display1, setDisplay1] = useState({ display: "none" });

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

  const handleClose = () => setShow(false);

  function validateConfirmForm() {
    return fields.code.length > 0;
  }

  async function onUpdate(event) {
    event.preventDefault();
    const session = await Auth.currentSession();
    let sanitizedPhoneNum = "";

    let response = await axios.get(`/checkUpdatedEmail/${oldEmail}/${account.companyEmail}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setIsSendingCode(true);
    const user = await Auth.currentAuthenticatedUser();

    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    if (account.companyNumber !== "") {
      sanitizedPhoneNum = "+" + account.companyNumber.replace(/\D/g, "");
    }

    let regPhoneNum = /^[+]\d{10}$/;

    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    setError("");
    setPhoneError("");

    if (!account.clinicName) {
      document.getElementById("clinicName").classList.add("is-danger");
    } else if (account.companyNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setPhoneError("Please enter a valid phone number.");
      document.getElementById("phone_number").classList.add("is-danger");
    } else if (account.companyEmail === "") {
      document.getElementById("email").classList.add("is-danger");
    } else if (account.firstName === "") {
      document.getElementById("fistName").classList.add("is-danger");
    } else if (account.lastName === "") {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (!account.companyEmail.match(regEmail)) {
      setError("Please enter a valid email address");
      document.getElementById("email").classList.add("is-danger");
    } else if (response.data.success === "false") {
      setError("Email is already in use!");
      document.getElementById("email").classList.add("is-danger");
    } else if (user.attributes.email === account.companyEmail) {
      await Auth.updateUserAttributes(user, { phone_number: sanitizedPhoneNum });
      const response = await axios.post("/updateIndividual", {
        oldEmail,
        companyEmail: account.companyEmail,
        clinicName: account.clinicName,
        companyNumber: sanitizedPhoneNum,
        firstName: account.firstName,
        lastName: account.lastName,
        specialty: account.specialty,
      });
      navigate("/individualAccount");
    } else if (response.data.success === "true") {
      try {

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
    let sanitizedPhoneNum = "+" + account.phoneNumber.replace(/\D/g, "");

    try {
      await Auth.verifyCurrentUserAttributeSubmit("email", fields.code);
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, { phone_number: sanitizedPhoneNum });
      const response = await axios.post("/updateIndividual", {
        oldEmail,
        companyEmail: account.companyEmail,
        clinicName: account.clinicName,
        companyNumber: sanitizedPhoneNum,
        firstName: account.firstName,
        lastName: account.lastName,
        specialty: account.specialty,
      });
      Auth.signOut();
      alert("Email updated successfully. Please sign in again.");
      navigate("/");
    } catch (error) {
      setError("Wrong confirmation code");
      setIsConfirming(false);
    }
  }

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
          url: "/deleteIndividual",
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

  const handleChange = (e) => {
    setAccount({
      ...account,
      [e.target.name]: e.target.value,
    });
  };

  function updatePage() {
    return (
      <MDBContainer className=" p-5  #6D757D">
        <div className={classes.editAccountForm}>
          <form onSubmit={onUpdate}>
            <fieldset>
              <div>
                <label for="clinicName">Clinic name:</label>
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
                />
              </div>
              <div>
                <label for="phoneNumber">Phone Number:</label>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="phone_number"
                  id="phone_number"
                  name="companyNumber"
                  className="input"
                  style={{margin:0}}
                  value={account.companyNumber}
                  onChange={handleChange}
                />
                {phoneError && <div className="errorIndi"> {phoneError} </div>}
              </div>
              <div>
                <label for="email">Email address:</label>
                <MDBInput 
                  wrapperClass="mb-3"
                  style={{margin:0}}
                  size="md"
                  label=""
                  type="email"
                  id="email"
                  name="companyEmail"
                  className="input"
                  required
                  value={account.companyEmail}
                  onChange={handleChange}
                />
                {error && <div className="errorIndi"> {error} </div>}
              </div>
              <div>
                <label for="firstName">First Name:</label>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="input"
                  required
                  value={account.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label for="lastName">Last Name:</label>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="input"
                  required
                  value={account.lastName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label for="specialty">Specialty:</label>
                <MDBInput
                  wrapperClass="mb-3"
                  size="md"
                  label=""
                  type="text"
                  id="specialty"
                  name="specialty"
                  value={account.specialty}
                  onChange={handleChange}
                />
              </div>
              {/* type update and change form to div */}
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
              <div className="modalLayout">
                <div className="modalContainer">
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
