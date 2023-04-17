import { Auth } from "aws-amplify";
import { useState, useEffect } from "react";
import React from "react";
import axios from "axios";
import { ulid } from "ulid";
import { useNavigate } from "react-router-dom";
import { Icon } from "react-icons-kit";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Link } from "react-router-dom";
import { MDBContainer, MDBCard, MDBCardBody, MDBInput } from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";
import "./registerDesign.css";
import { informationCircled } from "react-icons-kit/ionicons/informationCircled";

const CARD_OPTIONS = {
  iconStyle: "solid",
  style: {
    base: {
      iconColor: "#000",
      fontWeight: 400,
      fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
      fontSize: "16px",
      fontSmoothing: "antialiased",
      ":-webkit-autofill": { color: "#f8d212" },
      "::placeholder": { color: "#000000" },
    },
    invalid: {
      iconColor: "#6a5903",
      color: "#6a5903",
    },
  },
};

export default function Register() {
  const initialFormState = { formType: "companySignUp" };

  const [formState, updateFormState] = useState(initialFormState);
  const [error, setError] = useState();
  const [errorPhone, setErrorPhone] = useState();
  const [errorPassword, setErrorPassword] = useState();
  const [success, setSuccess] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const newUlid = ulid();
  let navigate = useNavigate();
  const { formType } = formState;
  const [icon, setIcon] = useState(informationCircled);

  /// Evil Guy
  window.onbeforeunload = function () {
    localStorage.clear();
  };

  useEffect(() => {
    if (!localStorage.getItem("securityLevel")) {
      localStorage.setItem("formType", "companySignUp");
      localStorage.setItem("securityLevel", "0");
    }
    if (!localStorage.getItem("phoneNumber")) {
      localStorage.setItem("phoneNumber", "");
    }
    if (!localStorage.getItem("specialty")) {
      localStorage.setItem("specialty", "");
    }
    if (!localStorage.getItem("clinicName")) {
      localStorage.setItem("clinicName", "");
    }
    if (!localStorage.getItem("username")) {
      localStorage.setItem("username", "");
    }
    if (!localStorage.getItem("password")) {
      localStorage.setItem("password", "");
    }
    if (!localStorage.getItem("confirmPassword")) {
      localStorage.setItem("confirmPassword", "");
    }
    if (!localStorage.getItem("firstName")) {
      localStorage.setItem("firstName", "");
    }
    if (!localStorage.getItem("lastName")) {
      localStorage.setItem("lastName", "");
    }
    if (window.performance) {
      if (performance.navigation.type === 1) {
        updateFormState(() => ({ ...formState, formType: localStorage.getItem("formType") }));
      }
    }
  }, []);

  function onChange(e) {
    e.persist();
    updateFormState(() => ({ ...formState, [e.target.name]: e.target.value }));
    localStorage.setItem(e.target.name, e.target.value);
    if (e.target.name === "intervalCount") {
      if (e.target.value === "1") {
        localStorage.setItem("subId", 1);
      } else if (e.target.value === "6") {
        localStorage.setItem("subId", 2);
      } else if (e.target.value === "12") {
        localStorage.setItem("subId", 3);
      }
    }
  }

  function selectChange(e) {
    e.persist();
    if (e.target.value === "1") {
      setFormState("individualSignUp");
    } else if (e.target.value === "0") {
      setFormState("companySignUp");
    }
    localStorage.setItem(e.target.name, e.target.value);
  }

  async function signUp(e) {
    e.preventDefault();
    ///Regular expressions for phone number and email
    // const session = await Auth.currentSession();
    let response = await axios.get(`/checkEmail/${localStorage.getItem("username")}`);
    let lowerEmail = localStorage.getItem("username").toLowerCase();
    let sanitizedPhoneNum = "+" + localStorage.getItem("phoneNumber").replace(/\D/g, "");
    let regPhoneNum = /^[+]\d{10}$/;
    let regEmail =
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    let regPass = /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
    //For statement to delete red input border
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }
    setError();
    setErrorPhone();
    setErrorPassword();

    ///If statements to check error to register
    if (!localStorage.getItem("clinicName")) {
      document.getElementById("clinicName").classList.add("is-danger");
    } else if (!localStorage.getItem("firstName") && localStorage.getItem("securityLevel") === "1") {
      document.getElementById("firstName").classList.add("is-danger");
    } else if (!localStorage.getItem("lastName") && localStorage.getItem("securityLevel") === "1") {
      document.getElementById("lastName").classList.add("is-danger");
    } else if (!localStorage.getItem("username")) {
      document.getElementById("email").classList.add("is-danger");
    } else if (!localStorage.getItem("username").match(regEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("email").classList.add("is-danger");
    } else if (!sanitizedPhoneNum.match(regPhoneNum) && localStorage.getItem("phoneNumber") !== "") {
      setErrorPhone("Please enter a valid phone number.");
      document.getElementById("phoneNumber").classList.add("is-danger");
    } else if (!localStorage.getItem("password")) {
      document.getElementById("password").classList.add("is-danger");
    } else if (
      !localStorage.getItem("confirmPassword") ||
      localStorage.getItem("password") !== localStorage.getItem("confirmPassword")
    ) {
      setErrorPassword("Passwords do not match.");
      document.getElementById("confirmPassword").classList.add("is-danger");
    } else if (localStorage.getItem("password").length < 8) {
      setErrorPassword("Password must be 8 characters long");
      document.getElementById("confirmPassword").classList.add("is-danger");
    } else if (!localStorage.getItem("password").match(regPass)) {
      setErrorPassword("Password must contain a number and special character.");
      document.getElementById("confirmPassword").classList.add("is-danger");
    } else if (response.data.success === "false") {
      setError("Specified email is already in use.");
      document.getElementById("email").classList.add("is-danger");
    } else {
      setFormState("purchaseSubscription");
    }
  }

  //It triggers by pressing the enter key
  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttons").click();
    }
  };

  //It triggers by pressing the enter key for individual page
  const handleKeypress2 = (e) => {
    if (e.key === "Enter") {
      document.getElementById("indiButtons").click();
    }
  };

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
      billing_details: {
        name: localStorage.getItem("name"),
      },
    });
    let lowerEmail = localStorage.getItem("username").toLowerCase();
    let sanitizedPhoneNum = "+" + localStorage.getItem("phoneNumber").replace(/\D/g, "");

    if (!error) {
      setIsDisabled(true);
      setLoading(true);
      try {
        const { id } = paymentMethod;
        const response = await axios.post("/payment", {
          subId: localStorage.getItem("subId"),
          id,
          email: lowerEmail,
          name: localStorage.getItem("name"),
        });

        if (response.data.success) {
          setSuccess(true);
          addToDatabase();
          if (localStorage.getItem("phoneNumber")) {
            await Auth.signUp({
              username: lowerEmail,
              password: localStorage.getItem("password"),
              attributes: {
                phone_number: sanitizedPhoneNum,
                "custom:securityLevel": localStorage.getItem("securityLevel"),
              },
            });
            localStorage.clear();
          } else {
            await Auth.signUp({
              username: lowerEmail,
              password: localStorage.getItem("password"),
              attributes: {
                "custom:securityLevel": localStorage.getItem("securityLevel"),
              },
            });
            localStorage.clear();
          }
        }
      } catch (error) {}
    }
  }

  ///A function adds data to database
  async function addToDatabase() {
    let lowerEmail = localStorage.getItem("username").toLowerCase();
    if (localStorage.getItem("securityLevel") === "0") {
      await axios.post("/newAdmin", {
        PK: "COMP#" + newUlid,
        SK: "COMP#" + newUlid,
        companyEmail: lowerEmail,
        clinicName: localStorage.getItem("clinicName"),
        companyNumber: localStorage.getItem("phoneNumber"),
        securityLevel: localStorage.getItem("securityLevel"),
      });
    } else if (localStorage.getItem("securityLevel") === "1") {
      await axios.post("/newIndividual", {
        PK: "COMP#" + newUlid,
        SK: "USER#" + newUlid,
        firstName: localStorage.getItem("firstName"),
        lastName: localStorage.getItem("lastName"),
        clinicName: localStorage.getItem("clinicName"),
        specialty: localStorage.getItem("specialty"),
        companyEmail: lowerEmail,
        companyNumber: localStorage.getItem("phoneNumber"),
        securityLevel: localStorage.getItem("securityLevel"),
      });
    }
  }

  function goBack() {
    if (localStorage.getItem("securityLevel") === "0") {
      setFormState("companySignUp");
    } else if (localStorage.getItem("securityLevel") === "1") {
      setFormState("individualSignUp");
    }
  }

  ///It clears error when users change page
  function clearErrors() {
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }
    setError();
  }

  function setFormState(newFormType) {
    updateFormState(() => ({ ...formState, formType: newFormType }));
    localStorage.setItem("formType", newFormType);
    clearErrors();
  }

  ///Navigates to login page
  function logIn() {
    navigate("/");
    window.location.reload();
  }

  return (
    <div className="p-5 d-flex align-items-center justify-content-center #6D757D">
      <div>
        <form onSubmit={signUp}>
          {formType === "companySignUp" && (
            <div>
              <MDBContainer>
                <MDBCard style={{ maxWidth: "500px" }}>
                  <MDBCardBody className="px-5">
                    {/* {error && <h1 className="error">{error}</h1>} */}
                    <h1 className="text-center mb-5">Register Now</h1>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="clinicName"
                        id="clinicName"
                        className="input"
                        required
                        value={!localStorage.getItem("clinicName") ? "" : localStorage.getItem("clinicName").toString()}
                        onChange={onChange}
                        placeholder="clinic/company name"
                        onKeyDown={handleKeypress}
                      />
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="username"
                        id="email"
                        className="input"
                        type="email"
                        required
                        value={!localStorage.getItem("username") ? "" : localStorage.getItem("username").toString()}
                        onChange={onChange}
                        placeholder="email"
                      />
                      {error && <h1 className="error">{error}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="phoneNumber"
                        value={
                          !localStorage.getItem("phoneNumber") ? "" : localStorage.getItem("phoneNumber").toString()
                        }
                        onChange={onChange}
                        placeholder="phone number (optional)"
                        id="phoneNumber"
                        className="input"
                        onKeyDown={handleKeypress}
                      />
                      {errorPhone && <h1 className="error">{errorPhone}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="password"
                        type="password"
                        id="password"
                        className="input"
                        required
                        value={!localStorage.getItem("password") ? "" : localStorage.getItem("password").toString()}
                        onChange={onChange}
                        placeholder="password"
                        onKeyDown={handleKeypress}
                      />
                      {errorPassword && <h1 className="error">{errorPassword}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="confirmPassword"
                        type="password"
                        id="confirmPassword"
                        className="input"
                        required
                        value={
                          !localStorage.getItem("confirmPassword")
                            ? ""
                            : localStorage.getItem("confirmPassword").toString()
                        }
                        onChange={onChange}
                        placeholder="confirm password"
                        onKeyDown={handleKeypress}
                      />
                    </div>
                    <div className="register-radio">
                      <input type="radio" id="company" name="securityLevel" value="0" onChange={selectChange} checked />
                      <label htmlFor="company" className="adminRadio">
                        Admin Account{" "}
                      </label>{" "}
                      <Icon icon={icon} class="myInfo1" size={20} />
                      <div class="hide">
                        An admin account allows you to have multiple physicians all with their own patients on the same
                        subscription.
                      </div>
                      <input type="radio" id="individual" name="securityLevel" value="1" onChange={selectChange} />
                      <label htmlFor="individual" className="physicianRadio">
                        Physician Account
                      </label>
                      <Icon icon={icon} class="myInfo2" size={20} />
                      <div class="hide">
                        A physician account is for individuals who will not have other physicians on the same
                        subscription.
                      </div>
                    </div>
                    <div className="centered-button">
                      <button className="btn btn-primary" size="sm" id="buttons" type="submit">
                        Continue to Payment
                      </button>
                    </div>
                    <p className="mb-0  text-center">
                      Already have an account? <a href="/">Log in here</a>
                    </p>
                  </MDBCardBody>
                </MDBCard>
              </MDBContainer>
            </div>
          )}
        </form>
        <form onSubmit={signUp}>
          {formType === "individualSignUp" && (
            <div>
              <MDBContainer>
                <MDBCard style={{ maxWidth: "500px" }}>
                  <MDBCardBody className="px-5">
                    <h1 className="text-center mb-5">Register Now</h1>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="firstName"
                        id="firstName"
                        className="input"
                        required
                        value={!localStorage.getItem("firstName") ? "" : localStorage.getItem("firstName").toString()}
                        onChange={onChange}
                        placeholder="first name"
                        onKeyDown={handleKeypress2}
                      />
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="lastName"
                        id="lastName"
                        className="input"
                        required
                        value={!localStorage.getItem("lastName") ? "" : localStorage.getItem("lastName").toString()}
                        onChange={onChange}
                        placeholder="last name"
                        onKeyDown={handleKeypress2}
                      />
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        // name="clinicName"
                        name="clinicName"
                        id="clinicName"
                        className="input"
                        required
                        value={!localStorage.getItem("clinicName") ? "" : localStorage.getItem("clinicName").toString()}
                        onChange={onChange}
                        placeholder="clinic/company name"
                        onKeyDown={handleKeypress2}
                      />
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="specialty"
                        id="specialty"
                        className="input"
                        value={!localStorage.getItem("specialty") ? "" : localStorage.getItem("specialty").toString()}
                        onChange={onChange}
                        placeholder="specialty (optional)"
                        onKeyDown={handleKeypress2}
                      />
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="username"
                        id="email"
                        className="input"
                        required
                        value={!localStorage.getItem("username") ? "" : localStorage.getItem("username").toString()}
                        onChange={onChange}
                        placeholder="email"
                        onKeyDown={handleKeypress2}
                      />
                      {error && <h1 className="error">{error}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="phoneNumber"
                        value={
                          !localStorage.getItem("phoneNumber") ? "" : localStorage.getItem("phoneNumber").toString()
                        }
                        onChange={onChange}
                        placeholder="phone number (optional)"
                        onKeyDown={handleKeypress2}
                      />
                      {errorPhone && <h1 className="error">{errorPhone}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="password"
                        type="password"
                        id="password"
                        className="input"
                        required
                        value={!localStorage.getItem("password") ? "" : localStorage.getItem("password").toString()}
                        onChange={onChange}
                        placeholder="password"
                        onKeyDown={handleKeypress2}
                      />
                      {errorPassword && <h1 className="error">{errorPassword}</h1>}
                    </div>
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="confirmPassword"
                        type="password"
                        id="confirmPassword"
                        className="input"
                        required
                        value={
                          !localStorage.getItem("confirmPassword")
                            ? ""
                            : localStorage.getItem("confirmPassword").toString()
                        }
                        onChange={onChange}
                        placeholder="confirm password"
                        onKeyDown={handleKeypress2}
                      />
                    </div>
                    <div className="register-radio">
                      <input type="radio" id="company" name="securityLevel" value="0" onChange={selectChange} />
                      <label htmlFor="company" className="adminRadio">
                        Admin Account{" "}
                      </label>
                      <Icon icon={icon} class="myInfo1" size={20} />
                      <div className="hide">
                        An admin account allows you to have multiple physicians all with their own patients on the same
                        subscription.
                      </div>
                      <input
                        type="radio"
                        id="individual"
                        name="securityLevel"
                        value="1"
                        onChange={selectChange}
                        checked
                      />
                      <label htmlFor="individual" className="physicianRadio">
                        Physician Account{" "}
                      </label>
                      <Icon icon={icon} class="myInfo2" size={20} />
                      <div className="hide">
                        Physician Account is for individuals who will not have other physicians on the same
                        subscription.
                      </div>
                    </div>
                    <div className="centered-button">
                      <button className="btn btn-primary" size="sm" id="indiButtons" type="submit">
                        Continue to Payment
                      </button>
                    </div>

                    <p className="mb-0  text-center">
                      {" "}
                      Already have an account? <a href="/">Log in here</a>
                    </p>
                  </MDBCardBody>
                </MDBCard>
              </MDBContainer>
            </div>
          )}
        </form>
        {formType === "confirmSignUp" && (
          <div>
            <div>
              <input name="authCode" onChange={onChange} placeholder="Confirmation code" />
            </div>
            <button className="mb-4 w-100 gradient-custom-4" size="lg">
              Continue to Payment
            </button>
          </div>
        )}
        {formType === "purchaseSubscription" && (
          <div>
            {!success ? (
              <form onSubmit={handlePaymentSubmit}>
                <MDBContainer className="p-5 d-flex align-items-center justify-content-center #6D757D">
                  <MDBCard className="w-45 px-5">
                    <MDBCardBody>
                      <div>
                        <fieldset>
                          <div className="text-center mb-5">
                            <h1 className="text-center mb-5 #00ffff">Purchase Subscription</h1>
                            <MDBInput
                              wrapperClass="mb-3"
                              name="name"
                              id="name"
                              value={!localStorage.getItem("name") ? "" : localStorage.getItem("name").toString()}
                              onChange={onChange}
                              placeholder="Name on Card"
                              size="sm"
                            />
                          </div>
                          <div className="text-center mb-5 card-element">
                            <CardElement options={CARD_OPTIONS} />
                          </div>
                        </fieldset>
                        <div className="subscription-radio">
                          <div>
                            <input
                              name="intervalCount"
                              id="1"
                              onChange={onChange}
                              checked={localStorage.getItem("intervalCount") === "1"}
                              wrapperClass="mb-3"
                              type="radio"
                              value="1"
                            />
                            <label className="text-center" htmlFor="1">
                              1 Month $150
                            </label>
                          </div>
                          <div>
                            <input
                              name="intervalCount"
                              id="2"
                              onChange={onChange}
                              checked={localStorage.getItem("intervalCount") === "6"}
                              wrapperClass="mb-3"
                              type="radio"
                              value="6"
                            />
                            <label className="text-center" htmlFor="2">
                              6 Months $900
                            </label>
                          </div>
                          <div>
                            <input
                              name="intervalCount"
                              id="3"
                              onChange={onChange}
                              checked={localStorage.getItem("intervalCount") === "12"}
                              wrapperClass="mb-3"
                              type="radio"
                              value="12"
                            />
                            <label className="text-center" htmlFor="3">
                              12 Months $1800
                            </label>
                          </div>
                        </div>
                        <div className="centered-button">
                          <button disabled={isDisabled} class="btn btn-primary" size="lg" id="buttons">
                            {loading ? "Processing payment..." : "Confirm and Create Account"}
                          </button>
                        </div>
                      </div>
                    </MDBCardBody>
                  </MDBCard>
                </MDBContainer>
                <div className="back-button">
                  <button className="btn btn-primary" size="sm" id="buttons" onClick={goBack}>
                    &#8249; Back
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2>
                  Account created successfully, please verify your email and <button class="btn btn-primary" size="sm" className="text-buttons" onClick={logIn}> Log in</button>
                </h2>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
