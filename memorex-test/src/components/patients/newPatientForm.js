import React from "react";
import classes from "../newUser.module.css";
import { ulid } from "ulid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useState, useEffect } from "react";

export default function NewPatientForm() {
  const initialFormState = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    sex: "Female",
    dementiaLikelihood: "Low",
    notes: "",
    formType: "createPatient",
  };

  const [formState, updateFormState] = useState(initialFormState);
  const [account, setAccount] = useState([]);
  const [physicianPath, setPhysicianPath] = useState();
  const patientUlid = "PATI#" + ulid();
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
    const accountResponse = await axios.get(`/user/${session.idToken.payload.email}`, { params: {
      idToken: session.accessToken.jwtToken
    }});
    setAccount(accountResponse.data.Items[0]);
    if (session.idToken.payload["custom:securityLevel"] === "2") {
      setPhysicianPath("/physicianAccount");
    } else if (session.idToken.payload["custom:securityLevel"] === "1") {
      setPhysicianPath("/individualAccount");
    }
  }

  function onChange(e) {
    e.persist();
    updateFormState(() => ({ ...formState, [e.target.name]: e.target.value }));
  }

  async function submitPatient(e) {
    e.preventDefault();
    const { firstName, lastName, email, phoneNumber, dateOfBirth, sex, dementiaLikelihood, notes } = formState;

    ///Regular expressions for phone number and email
    let sanitizedPhoneNum = "+" + phoneNumber.replace(/\D/g, "");
    let regPhoneNum = /^[+]\d{10}$/;
    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

    //For statement to delete red input border
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    setError("");
    setErrorPhone("");

    if (!firstName) {
      document.getElementById("firstName").classList.add("is-danger");
    } else if (!lastName) {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (!email) { 
      document.getElementById("email").classList.add("is-danger");
    } else if (!email.match(regEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("email").classList.add("is-danger");
    } else if (phoneNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setErrorPhone("Please enter a valid phone number.");
      document.getElementById("phoneNumber").classList.add("is-danger");
    } else if (!dateOfBirth) {
      document.getElementById("dateOfBirth").classList.add("is-danger");
    } else if (!sex) {
      document.getElementById("sex").classList.add("is-danger");
    } else {
      const response = await axios.post("/newPatient", {
        PK: account.SK,
        SK: patientUlid,
        physicianEmail: account.email,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: phoneNumber,
        dateOfBirth: dateOfBirth,
        sex: sex,
        dementiaLikelihood: dementiaLikelihood,
        notes: notes,
      });
      if (response.data.success === "false") {
        setError("Specified email is already in use.");
        document.getElementById("email").classList.add("is-danger");
      } else {
        navigate(physicianPath);
      }
    }
  }

  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("buttons").click();
    }
  };

  return (
    <form onSubmit={submitPatient} className={classes.newPatientForm}>
      {formType === "createPatient" && (
          <div>
            <div className={classes.column}>
          <div className={classes.control}>
            <div className={classes.forminput}>
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                className="input"
                name="firstName"
                required
                onChange={onChange}
                onKeyDown={handleKeypress}
              />
            </div>
            <div className={classes.forminput}>
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                className="input"
                name="lastName"
                required
                onChange={onChange}
                onKeyDown={handleKeypress}
              />
            </div>
          </div>
          <div className={classes.control}>
            <div className={classes.forminput}>
              <label htmlFor="email">Email</label>
              {error && <div className="error"> {error} </div>}
              <input
                type="text"
                id="email"
                className="input"
                name="email"
                required
                onChange={onChange}
                onKeyDown={handleKeypress}
              />
            </div>
            <div className={classes.forminput}>
              <label htmlFor="phoneNumber">Phone Number</label>
              {errorPhone && <div className="error"> {errorPhone} </div>}
              <input
                type="text"
                id="phoneNumber"
                className="input"
                name="phoneNumber"
                onChange={onChange}
                onKeyDown={handleKeypress}
                placeholder="* optional"
              />
            </div>
          </div>
          </div>
          <div className={classes.column}>
          <div className={classes.control}>
            <div className={classes.forminput}>
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                min="1900-01-01"
                max="9999-12-31"
                required
                id="dateOfBirth"
                className="input"
                name="dateOfBirth"
                onChange={onChange}
              />
            </div>
            <div className={classes.forminput}>
              <label htmlFor="sex">Sex</label>
              <select id="sex" name="sex" onChange={onChange}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className={classes.control}>
            <div className={classes.forminput}>
              <label htmlFor="dementiaLikelihood">Dementia Likelihood</label>
              <div>
                <select name="dementiaLikelihood" onChange={onChange}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div className={classes.forminput}>
              <label htmlFor="notes">Notes</label>
              <input
                type="text"
                id="notes"
                name="notes"
                onChange={onChange}
                onKeyDown={handleKeypress}
                placeholder="* optional"
              />
            </div>
          </div>
          </div>
            <button class="btn btn-primary anchored-button"  id="buttons">
              Create Patient
            </button>
        </div>
      )}
    </form>
  );
}
