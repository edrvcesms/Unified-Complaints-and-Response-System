import { verifyOtpAndRegister } from "../../../services/authentication/VerifyOtp";
import type { OtpVerificationData } from "../../../types/auth/otpVerify";
import { useState } from "react";

export const OtpVerification: React.FC = () => {

  const [formData, setFormData] = useState<OtpVerificationData | null>(null);
  const [frontId, setFrontId] = useState<File | null>(null);
  const [backId, setBackId] = useState<File | null>(null);
  const [selfieWithId, setSelfieWithId] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value } as OtpVerificationData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      const response = await verifyOtpAndRegister(formData, frontId!, backId!, selfieWithId!);
      console.log("OTP verification and registration successful:", response);
    } catch (error) {
      console.error("OTP verification and registration failed:", error);
    }
  };

  return (
    <>
      <h2>OTP Verification</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="otp">OTP:</label> 
          <input
            type="text"
            id="otp"
            name="otp"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="frontId">Front ID:</label>
          <input
            type="file"
            id="frontId"  
            name="frontId"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setFrontId)}
            required
          />
        </div>
        <div>
          <label htmlFor="backId">Back ID:</label>
          <input
            type="file"
            id="backId"
            name="backId"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setBackId)}
            required
          />
        </div>
        <div>
          <label htmlFor="selfieWithId">Selfie with ID:</label>
          <input
            type="file"
            id="selfieWithId"
            name="selfieWithId"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setSelfieWithId)}
                        required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="first_name">First Name:</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="middle_name">Middle Name:</label>
          <input
            type="text"
            id="middle_name"
            name="middle_name"
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="last_name">Last Name:</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="suffix">Suffix:</label>
          <input
            type="text"
            id="suffix"
            name="suffix"
            onChange={handleChange}
            placeholder="Jr., Sr., III, etc."
          />
        </div>
        <div>
          <label htmlFor="age">Age:</label>
          <input
            type="number"
            id="age"
            name="age"
            onChange={handleChange}
            required
            min="0"
          />
        </div>
        <div>
          <label htmlFor="birthdate">Birthdate:</label>
          <input
            type="date"
            id="birthdate"
            name="birthdate"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="gender">Gender:</label>
          <select
            id="gender"
            name="gender"
            onChange={(e) => setFormData({ ...formData, gender: e.target.value } as OtpVerificationData)}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="phone_number">Phone Number:</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="barangay">Barangay:</label>
          <input
            type="text"
            id="barangay"
            name="barangay"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="full_address">Full Address:</label>
          <textarea
            id="full_address"
            name="full_address"
            onChange={(e) => setFormData({ ...formData, full_address: e.target.value } as OtpVerificationData)}
            required
          />
        </div>
        <div>
          <label htmlFor="zip_code">Zip Code:</label>
          <input
            type="text"
            id="zip_code"
            name="zip_code"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="id_type">ID Type:</label>
          <select
            id="id_type"
            name="id_type"
            onChange={(e) => setFormData({ ...formData, id_type: e.target.value } as OtpVerificationData)}
            required
          >
            <option value="">Select ID Type</option>
            <option value="National ID">National ID</option>
            <option value="Driver's License">Driver's License</option>
            <option value="Passport">Passport</option>
            <option value="Voter's ID">Voter's ID</option>
            <option value="SSS ID">SSS ID</option>
            <option value="UMID">UMID</option>
            <option value="PhilHealth ID">PhilHealth ID</option>
          </select>
        </div>
        <div>
          <label htmlFor="id_number">ID Number:</label>
          <input
            type="text"
            id="id_number"
            name="id_number"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="latitude">Latitude (Optional):</label>
          <input
            type="text"
            id="latitude"
            name="latitude"
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="longitude">Longitude (Optional):</label>
          <input
            type="text"
            id="longitude"
            name="longitude"
            onChange={handleChange}
          />
        </div>
        <button type="submit">Verify OTP and Register</button>
      </form>
    </>
  );
};