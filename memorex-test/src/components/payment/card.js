import { CardElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState, useEffect } from "react";
import { MDBBtn, MDBContainer, MDBCard, MDBCardBody, MDBInput, MDBCheckbox } from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";
const CARD_OPTIONS = {
  iconStyle: "solid",
  style: {
    base: {
      iconColor: "#c4f0ff",
      fontWeight: 500,
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

export default function Payment() {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <>
      <CardElement options={CARD_OPTIONS} />
    </>
  );
}
