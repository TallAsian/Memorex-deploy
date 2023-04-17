import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";

export default function FileUploadTest() {
   const [testImage, setTestImage] = useState("");
   const fileName = "test-2.png";
   useEffect(() => {
      getImage();
    }, []);
    
   async function uploadFile() {
      await axios.post("/uploadTestResult", {
         fileName
       });
   }

   async function getImage() {
      let imageResponse = await axios.get(`/getTestResults/${fileName}`);
      setTestImage(imageResponse.data);
   }

  

  return (
    <div>
      <img src={testImage} alt="testImage" />
      <button onClick={uploadFile}>Test</button>
    </div>
  );
}
