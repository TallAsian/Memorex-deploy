import { Auth} from "aws-amplify";
import { useState, useEffect } from "react";
import "./LogInPortal.css";
import { useNavigate } from "react-router-dom";
import React from "react";
import { Icon } from "react-icons-kit";
import { eyeOff } from "react-icons-kit/feather/eyeOff";
import { eye } from "react-icons-kit/feather/eye";
import { MDBContainer, MDBCard, MDBCardBody, MDBInput } from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";

///Log in component that handles the entire log in functionality.
///The page changes what is being displayed depending on the current form state.
export default function Login() {
  /// The initial form state that the page will be in. Unset username(email), password,
  const initialFormState = {
    username: "",
    password: "",
    formType: "signIn",
  };

  /// the different useStates
  const [formState, updateFormState] = useState(initialFormState);
  const [user, updateUser] = useState(null);
  const [error, setError] = useState();
  const [session, setSession] = useState();

  /// The IAM user being used in Amazon Web Services
  const AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: "AKIAX3FHVXYSIVRBPHGJ",
    secretAccessKey: "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",
    region: "us-east-2",
  });

  let navigate = useNavigate();

  /// Function that navigates users to their designated account page depending on their security level(account type).
  function pageChange(secLevel) {
    let path = "/";

    /// Security level 0 = Company Admin
    if (secLevel === "0") {
      path = "/adminAccount";
    }
    /// Security level 1 = Individual Physician
    else if (secLevel === "1") {
      path = "/individualAccount";
    }
    ///security level 2 = Company Physician
    else if (secLevel === "2") {
      path = "/physicianAccount";
    }
    /// Security level 3 = Locked Account
    else if (secLevel === "3") {
      Auth.signOut();
      path = "/accessDenied";
    }
    return navigate(path);
  }

  async function checkUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      updateUser(user);
      changeFormState("signIn");
    } catch (err) {}
  }

  useEffect(() => {
    checkUser();
  }, []);

  ///
  function onChange(e) {
    e.persist();
    updateFormState(() => ({ ...formState, [e.target.name]: e.target.value }));
    clearErrors();
  }

  const { formType } = formState;

  ///This function sets a new password for a user.
  async function setPassword() {
    const { setpassword, user } = formState;
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
    await Auth.completeNewPassword(user, setpassword).then((user) => {});

    var params = {
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
      UserPoolId: "us-east-2_tZIGe1Zgs",
      Username: user.username,
    };
    cognitoidentityserviceprovider.adminUpdateUserAttributes(params, function (err, data) {});

    navigate("/physicianAccount");
  }

  async function signIn() {
    const { username, password } = formState;
    try {
      await Auth.signIn(username, password).then((user) => {
        if (user.challengeName === "NEW_PASSWORD_REQUIRED") {
          const setFormState = {
            setpassword: "",
            confirmsetpassword: "",
            user: user,
            formType: "setPassword",
          };

          updateFormState(setFormState);
          clearErrors();
        }
      });

      const userSession = await Auth.currentSession();
      setSession(userSession.idToken.payload);
        const secLevel = userSession.idToken.payload["custom:securityLevel"];
        pageChange(secLevel);
    } catch (exception) {
      const inputs = document.getElementsByClassName("is-danger");
      for (let i = 0; i < inputs.length; i++) {
        inputs[i].classList.remove("is-danger");
      }
      if (!username) {
        setError("Enter your email address.");
        document.getElementById("username").classList.add("is-danger");
      } else if (!password) {
        setError("Enter your password.");
        document.getElementById("password").classList.add("is-danger");
      } else if (exception.name === "NotAuthorizedException") {
        setError("Incorrect password.");
        document.getElementById("password").classList.add("is-danger");
      } else if (exception.name === "UserNotFoundException") {
        setError("User does not exist.");
      } else if (exception.name === "UserNotConfirmedException") {
        setError("Account not verified. Please check email.");
      }
    }
  }

  async function forgottenPassword() {
    const { username } = formState;
    try {
      setError();
      await Auth.forgotPassword(username);
      changeFormState("resetPassword");
    } catch (exception) {
      if (!username) {
        setError("Enter your email address.");
      } else if (exception.name === "UserNotFoundException") {
        setError("The email address is not found");
      }
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

  async function resetPassword() {
    const { username, code, new_password } = formState;
    try {
      await Auth.forgotPasswordSubmit(username, code, new_password);
      changeFormState("signIn");
    } catch (exception) {
      if (!code) {
        setError("Confirmation Code cannot be empty");
      } else if (!new_password) {
        setError("Password cannot be empty");
      } else if (exception.name === "InvalidPasswordException") {
        setError(exception.message.replace("Password did not conform with policy:", ""));
      } else if (exception.name === "CodeMismatchException") {
        setError("Invalid verification code");
      }
    }
  }

  function changeFormState(newFormType) {
    updateFormState(() => ({ ...formState, formType: newFormType }));
    clearErrors();
  }

  //It triggers by pressing the enter key
  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttons").click();
    }
  };

  //It triggers by pressing the enter key for forgot password page
  const handleKeypress2 = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttonForgot").click();
    }
  };

  //It triggers by pressing the enter key for reset password
  const handleKeypress3 = (e) => {
    if (e.key === "Enter") {
      document.getElementById("buttonsReset").click();
    }
  };

  //Triger for password toggle for eye icon
  const [type, setType] = useState("password");
  const [icon, setIcon] = useState(eyeOff);

  const handleToggle = () => {
    if (type === "password") {
      setIcon(eye);
      setType("text");
    } else {
      setIcon(eyeOff);
      setType("password");
    }
  };

  return (
    <div className="p-5 d-flex align-items-center justify-content-center #6D757D">
      <div className="login-page">
        {formType === "signIn" && (
          <div>
            <MDBContainer>
              <MDBCard className="w-40 px-5">
                <MDBCardBody className="px-5">
                  <h1 className="text-center mb-5">Log In</h1>
                  {error && <div className="error">{error}</div>}
                  <div>
                    <MDBInput
                      wrapperClass="mb-3"
                      label=""
                      size="sm"
                      name="username"
                      id="username"
                      onChange={onChange}
                      placeholder="email"
                      onKeyDown={handleKeypress}
                    />
                  </div>
                  <div className="view-pass-div">
                    <MDBInput
                      wrapperClass="mb-3"
                      label=""
                      size="sm"
                      className="view-pass-input"
                      id="password"
                      name="password"
                      type={type}
                      onChange={onChange}
                      placeholder="password"
                      onKeyDown={handleKeypress}
                    />
                    <div onClick={handleToggle} className="view-pass-icon">
                      <Icon icon={icon} size={25} />
                    </div>
                  </div>
                  <div className="centered-button">
                    <button class="btn btn-primary" size="lg" id="buttons" onClick={signIn}>
                      Sign In
                    </button>
                    <button
                      class="btn btn-primary"
                      size="sm"
                      className="text-buttons"
                      onClick={() => 
                        changeFormState("forgotPassword")
                      }
                    >
                      Forgot Password?
                    </button>

                    <p className="mb-0  text-center">
                      Don't have an account? <a href="/register">Register now</a>
                    </p>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBContainer>
          </div>
        )}

        {formType === "forgotPassword" && (
          <div>
            <MDBContainer>
              <MDBCard className="w-40 px-5">
                <MDBCardBody className="px-5">
                  {error && <h1 className="error">{error}</h1>}
                  <h1 className="text-center mb-5">Forgot your password?</h1>
                  <div className="forgot-password-inputs">
                    <MDBInput
                      wrapperClass="mb-3"
                      label=""
                      size="sm"
                      name="username"
                      onChange={onChange}
                      placeholder="email"
                      onKeyDown={handleKeypress2}
                    />
                  </div>
                  <div className="centered-button">
                    <button class="btn btn-primary" size="sm" id="buttonForgot" onClick={forgottenPassword}>
                      Reset Password
                    </button>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBContainer>
          </div>
        )}
        {formType === "resetPassword" && (
          <div>
            <MDBContainer>
              <MDBCard className="w-40 px-5">
                <MDBCardBody className="px-5">
                  {error && <h1 className="error">{error}</h1>}
                  <h1 className="text-center mb-5">Change your password</h1>
                  <div className="forgot-password-inputs">
                    <div>
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        name="code"
                        onChange={onChange}
                        placeholder="verification code"
                        onKeyDown={handleKeypress3}
                      />
                    </div>
                    <div className="view-pass-div-forgot-password">
                      <MDBInput
                        wrapperClass="mb-3"
                        label=""
                        size="sm"
                        className="view-pass-input"
                        name="new_password"
                        type={type}
                        onChange={onChange}
                        placeholder="new password"
                        onKeyDown={handleKeypress3}
                      />
                      <div onClick={handleToggle} className="view-pass-icon">
                        <Icon icon={icon} size={25} />
                      </div>
                    </div>
                    <div className="centered-button">
                      <button class="btn btn-primary" size="sm" id="buttonsReset" onClick={resetPassword}>
                        Reset Password
                      </button>
                    </div>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBContainer>
          </div>
        )}
        {formType === "setPassword" && (
          <div>
            <MDBContainer>
              <MDBCard style={{ maxWidth: "500px" }}>
                <MDBCardBody className="px-5">
                  <h1>Set Your Password</h1>
                  <div>
                    <MDBInput
                      wrapperClass="mb-3"
                      label=""
                      size="sm"
                      type="password"
                      name="setpassword"
                      onChange={onChange}
                      placeholder="password"
                      onKeyDown={handleKeypress3}
                    />
                  </div>
                  <div>
                    <MDBInput
                      wrapperClass="mb-3"
                      label=""
                      size="sm"
                      type="password"
                      name="confirmsetpassword"
                      onChange={onChange}
                      placeholder="confirm password"
                      onKeyDown={handleKeypress3}
                    />
                  </div>
                  <input name="user" type="hidden" value={user} />
                    <div className="centered-button">
                  <button class="btn btn-primary" size="sm" id="buttonsReset" onClick={setPassword}>
                    Set Password
                  </button>
                  </div>
                </MDBCardBody>
              </MDBCard>
            </MDBContainer>
          </div>
        )}
      </div>
    </div>
  );
}
