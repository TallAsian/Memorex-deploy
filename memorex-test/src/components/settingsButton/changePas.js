import { Auth } from "aws-amplify";
import { FormGroup, FormControl } from "react-bootstrap";
import { useFormFields } from "../../lib/hooksLib";
import "./ChangePassword.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {MDBContainer, MDBCard, MDBCardBody} from 'mdb-react-ui-kit';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ChangePassword() {
  const [fields, handleFieldChange] = useFormFields({
    password: "",
    oldPassword: "",
    confirmPassword: "",
  });
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState();
  const [errorNew, setErrorNew] = useState();

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
  }
  //This will check whether the password input fields are empty or not
  //and check the inputs for the new password are the same
  function validateForm() {
    return fields.oldPassword.length > 0 && fields.password.length > 0 ;
  }
  
  //This function uses the Auth module from Amplify to get the current user
  //then uses that to change their password by passing in the old and new password
  async function handleChangeClick(event) {
    event.preventDefault();

    setIsChanging(true);
    
    const inputs = document.getElementsByClassName("is-danger");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].classList.remove("is-danger");
    }

    setError("");
    setErrorNew("");

    if(fields.password !== fields.confirmPassword){
      document.getElementById("password").classList.add("is-danger");
      setErrorNew("Do not match");
    }
    else{
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        await Auth.changePassword(currentUser, fields.oldPassword, fields.password);
        Auth.signOut();
        navigate("/");
      } catch (error) {
        setIsChanging(false);
        // let path = "/accessDenied";
        // navigate(path);
        console.log(error);
        document.getElementById("oldPassword").classList.add("is-danger");
        setError("Please enter correct password");
        // if(error === "NotAuthorizedException: Incorrect username or password."){
        //   console.log("here");
        //   document.getElementById("oldPassword").classList.add("is-danger");
        //   setError("Please enter correct password");
        // }      
      }
    }
  }

  return (
    <MDBContainer className=' p-5 d-flex align-items-center justify-content-center #6D757D'>
    <MDBCard  className="w-40 px-5" >
    <MDBCardBody >
    <div className="ChangePassword">
      <form onSubmit={handleChangeClick}>
        <FormGroup controlId="oldPassword">
          <label>Old Password</label>
          {error && <div className="error"> {error} </div>}
          <FormControl type="password" id="oldPassword" className="input" onChange={handleFieldChange} value={fields.oldPassword} />
        </FormGroup>
        <FormGroup controlId="password">
          <label>New Password</label>
          {errorNew && <div className="error"> {errorNew} </div>}
          <FormControl type="password" id="password" className="input" onChange={handleFieldChange} value={fields.password} />
        </FormGroup>
        <FormGroup controlId="confirmPassword">
          <label>Confirm Password</label>
          <FormControl type="password" id="confirmPassword" className="input" onChange={handleFieldChange} value={fields.confirmPassword} />
        </FormGroup>
        <button class="btn btn-primary" block type="submit" disabled={!validateForm()} isLoading={isChanging}>
          Change Password
        </button>
      </form>
    </div>
    </MDBCardBody>
    </MDBCard>
    </MDBContainer>
  );
}
