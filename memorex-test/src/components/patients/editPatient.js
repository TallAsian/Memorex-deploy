import React from "react";
import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate, useLocation } from "react-router-dom";
import classes from "../newUser.module.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../adminUser/editdesign.css";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default function EditPatient() {
  const [loaded, setLoaded] = useState(false);
  const loc = useLocation();
  let pk = loc.state.PK.split("#");
  let sk = loc.state.SK.split("#");
  const [physicianPath, setPhysicianPath] = useState();
  const [error, setError] = useState();
  const [phoneError, setPhoneError] = useState();
  const [patient, setPatient] = useState();
  const [oldEmail, setOldEmail] = useState();
  const [myEmail, setMyEmail] = useState();
  const [show, setShow] = useState(false);
  const [display, setDisplay] = useState({ display: "none" });

  const handleClose = () => setShow(false);

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
    const accountResponse = await axios.get(`/${pk[0]}/${pk[1]}/${sk[0]}/${sk[1]}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    if (session.idToken.payload["custom:securityLevel"] === "2") {
      setPhysicianPath("/physicianAccount");
    } else if (session.idToken.payload["custom:securityLevel"] === "1") {
      setPhysicianPath("/individualAccount");
    }
    setPatient(accountResponse.data.Item);
    setOldEmail(accountResponse.data.Item.email);
    setLoaded(true);
  }

  function handleDelete(e, theEmail) {
    e.preventDefault(); // Stop the form from submitting
    setShow(true);
    setMyEmail(theEmail);
  }

  async function deletePatient(email) {
    setDisplay({ display: "inline" });

    axios({
      method: "post",
      url: "/deletePatient",
      data: JSON.stringify({
        email: email,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    handleClose();
    navigate(physicianPath);
  }

  async function onUpdate(event) {
    event.preventDefault();
    let sanitizedPhoneNum = "";

    ///Added
    const session = await Auth.currentSession();
    let response = await axios.get(`/checkUpdatedEmail/${oldEmail}/${patient.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    if (patient.phoneNumber !== "") {
      sanitizedPhoneNum =  patient.phoneNumber.replace(/\D/g, "");
    }

    let regPhoneNum = /^\d{10}$/;

    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    setError("");
    setPhoneError("");

    if (patient.firstName === "") {
      document.getElementById("firstName").classList.add("is-danger");
    } else if (patient.lastName === "") {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (patient.phoneNumber !== "" && !sanitizedPhoneNum.match(regPhoneNum)) {
      setPhoneError("Please enter a valid phone number.");
      document.getElementById("phoneNumber").classList.add("is-danger");
    } else if (patient.email === "") {
      setError("Email is required");
      document.getElementById("email").classList.add("is-danger");
    } else if (!patient.email.match(regEmail)) {
      setError("Enter a valid email address please");
      document.getElementById("email").classList.add("is-danger");
    } else if (response.data.success === "false") {
      setError("Email is already in use!");
      console.log("here");
      console.log(response.data.message);
      document.getElementById("email").classList.add("is-danger");
    } else {
      const response = await axios.post("/updatePatient", {
        oldEmail,
        PK: patient.PK,
        SK: patient.SK,
        physicianEmail: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phoneNumber: sanitizedPhoneNum,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        dementiaLikelihood: patient.dementiaLikelihood,
        notes: patient.notes,
      });
      navigate(physicianPath);
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
    setPatient({
      ...patient,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {loaded && (
        <div>
          <form onSubmit={onUpdate} className={classes.newPatientForm}>
            <div>
              <h2>Edit Patient</h2>
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
                      value={patient.firstName}
                      onChange={handleChange}
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
                      value={patient.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className={classes.control}>
                  <div className={classes.forminput}>
                    <label htmlFor="email">Email</label>
                    {error && <div className="error"> {error} </div>}
                    <input
                      type="email"
                      id="email"
                      className="input"
                      name="email"
                      required
                      value={patient.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={classes.forminput}>
                    <label htmlFor="phoneNumber">Phone Number</label>
                    {phoneError && <div className="error"> {phoneError} </div>}
                    <input
                      type="text"
                      id="phoneNumber"
                      className="input"
                      name="phoneNumber"
                      value={patient.phoneNumber}
                      onChange={handleChange}
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
                      value={patient.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={classes.forminput}>
                    <label htmlFor="sex">Sex</label>
                    <select defaultValue={patient.sex} name="sex" onChange={handleChange}>
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
                      <select
                        defaultValue={patient.dementiaLikelihood}
                        name="dementiaLikelihood"
                        onChange={handleChange}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div className={classes.forminput}>
                    <label htmlFor="notes">Notes</label>
                    <input type="text" id="notes" name="notes" value={patient.notes} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
              <div className="centered-buttons">
                <button class="btn btn-primary" id="buttons">
                  Update Patient
                </button>
                <button className="btn btn-primary" id="buttons" onClick={(e) => handleDelete(e, patient.email)}>
                  Delete patient
                </button>
              </div>
          </form>
          <div className="Modal" style={display}>
            <Modal show={show} onHide={handleClose}>
              <div>
                <div>
                  <Modal.Header>
                    <Modal.Title>Delete Patient: {myEmail}?</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <p>Are you sure you want to delete this Patient?</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      No
                    </Button>
                    <Button variant="primary" onClick={() => deletePatient(myEmail)}>
                      Yes
                    </Button>
                  </Modal.Footer>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      )}
    </>
  );
}
