import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate} from "react-router-dom";
import { FormGroup, FormControl } from "react-bootstrap";
import { useFormFields } from "../../lib/hooksLib";
import { MDBContainer, MDBCard, MDBCardBody, MDBInput} from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";

export default function EditPhysicianAccount() {
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

  function validateConfirmForm() {
    return fields.code.length > 0;
  }

  async function onUpdate(event) {
    event.preventDefault();
    const session = await Auth.currentSession();
    let sanitizedPhoneNum = "";

    let response = await axios.get(`/checkUpdatedEmail/${oldEmail}/${account.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setIsSendingCode(true);
    const user = await Auth.currentAuthenticatedUser();

    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    if (account.phoneNumber !== "") {
      sanitizedPhoneNum = "+" + account.phoneNumber.replace(/\D/g, "");
    }

    let regPhoneNum = /^[+]\d{10}$/;

    setError();
    setErrorPhone();

    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    if (account.firstName === "") {
      document.getElementById("firstName").classList.add("is-danger");
    } else if (account.lastName === "") {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (account.phoneNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setErrorPhone("Please enter a valid phone number.");
      document.getElementById("phoneNumber").classList.add("is-danger");
    } else if (account.email === "") {
      setError("Email is required");
      document.getElementById("email").classList.add("is-danger");
    } else if (!account.email.match(regEmail)) {
      setError("Please enter a valid email address");
      document.getElementById("email").classList.add("is-danger");
    } else if (response.data.success === "false") {
      setError("Email is already in use!");
      document.getElementById("email").classList.add("is-danger");
    } else if (user.attributes.email === account.email) {
      await Auth.updateUserAttributes(user, { phone_number: sanitizedPhoneNum });
      const response = await axios.post("/updatePhysician", {
        oldEmail,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phoneNumber: sanitizedPhoneNum,
        specialty: account.specialty,
      });
      navigate("/physicianAccount");
    } else {
      try {
        const user = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(user, { email: account.email });
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
      const response = await axios.post("/updatePhysician", {
        oldEmail,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phoneNumber: sanitizedPhoneNum,
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

  //It triggers by pressing the enter key
  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttons").click();
    }
  };

  //It triggers by pressing the enter key for confirmation
  const handleKeypress2 = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttonsConfirm").click();
    }
  };

  const handleChange = (e) => {
    setAccount({
      ...account,
      [e.target.name]: e.target.value,
    });
  };

  function updatePage() {
    return (
      <MDBContainer className=" p-3 d-flex align-items-center justify-content-center #6D757D">
        <MDBCard className="w-40 px-5">
          <MDBCardBody>
            <form onSubmit={onUpdate}>
              <fieldset>
                <div className="edit-inputs">
                  <label>First Name</label>
                  <MDBInput
                    wrapperClass="mb-3"
                    size="sm"
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="input"
                    required
                    value={account.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="edit-inputs">
                  <label>Last Name</label>
                  <MDBInput
                    wrapperClass="mb-3"
                    size="sm"
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="input"
                    required
                    value={account.lastName}
                    onChange={handleChange}
                  />
                </div>
                <div className="edit-inputs">
                  <label>Email address</label>
                  <MDBInput
                    wrapperClass="mb-3"
                    size="sm"
                    type="email"
                    name="email"
                    id="email"
                    className="input"
                    required
                    value={account.email}
                    onChange={handleChange}
                  />
                  {error && <h1 className="error">{error}</h1>}
                </div>
                <div className="edit-inputs">
                  <label>Phone Number</label>
                  <MDBInput
                    wrapperClass="mb-3"
                    size="sm"
                    type="phone_number"
                    id="phoneNumber"
                    name="phoneNumber"
                    className="input"
                    value={account.phoneNumber}
                    onChange={handleChange}
                  />
                  {errorPhone && <h1 className="error">{errorPhone}</h1>}
                </div>
                <div className="edit-inputs">
                  <label>Specialty</label>
                  <MDBInput
                    wrapperClass="mb-3"
                    size="sm"
                    type="text"
                    id="specialty"
                    name="specialty"
                    className="input"
                    value={account.specialty}
                    onChange={handleChange}
                  />
                </div>
                <div className="centered-button">
                  <button class="btn btn-primary" id="buttons" type="update" isLoading={isSendingCode}>
                    Update account
                  </button>
                </div>
              </fieldset>
            </form>
          </MDBCardBody>
        </MDBCard>
      </MDBContainer>
    );
  }

  function renderConfirmationForm() {
    return (
      <form onSubmit={handleConfirm}>
        <FormGroup controlId="code">
          <label>Confirmation Code</label>
          {error && <h1 className="error">{error}</h1>}
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
