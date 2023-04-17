import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Payment from "./Payment";
import { Amplify, Auth, Hub } from "aws-amplify";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const PUBLIC_KEY =
  "pk_test_51MjQdBAB1aJ9omUKBhuJXUENKooshYFgFBMIFvmmkkn5ypuKu0X1E2eWTVOvuaTiOukSlCzU08hT4uc0hkBoZVTt00LPm9s6TL";
const stripeTestPromise = loadStripe(PUBLIC_KEY);
export default function Stripe() {
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
  return (
    <Elements stripe={stripeTestPromise}>
      <Payment />
    </Elements>
  );
}
