import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { BrandingPanel } from "../components/BrandingPanel";
import { MobileHeader } from "../components/Mobileheader";
import { AlertBanner } from "../components/AlertBanner";
import { ErrorMessage } from "../components/ErrorMessage";
import { LanguageSwitcher } from "../../general/LanguageSwitcher";
import { createNewPassword, requestResetPassword, verifyResetPasswordOtp } from "../../../services/authentication/auth";
import { validateEmail, validatePassword } from "../../../utils/validators";
import type { LoginRequestData } from "../../../types/auth/login";

type Step = "request" | "verify" | "reset" | "done";

interface FormState {
	email: string;
	otp: string;
	new_password: string;
	confirm_new_password: string;
}

interface FormErrors {
	email?: string;
	otp?: string;
	new_password?: string;
	confirm_new_password?: string;
	general?: string;
}

const defaultFormState: FormState = {
	email: "",
	otp: "",
	new_password: "",
	confirm_new_password: "",
};

export const ForgotPasswordPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("request");
	const [formData, setFormData] = useState<FormState>(defaultFormState);
	const [errors, setErrors] = useState<FormErrors>({});
	const [infoMessage, setInfoMessage] = useState<string>("");

	const requestMutation = useMutation({
		mutationFn: () => requestResetPassword({ email: formData.email.trim() }),
		onSuccess: () => {
			setInfoMessage(t("auth.emailSent"));
			setErrors({});
			setStep("verify");
		},
		onError: (error: any) => {
			setErrors({ general: error?.message || "Request failed. Please try again." });
		},
	});

	const verifyMutation = useMutation({
		mutationFn: () => verifyResetPasswordOtp({ email: formData.email.trim(), otp: formData.otp.trim() }),
		onSuccess: () => {
			setInfoMessage("");
			setErrors({});
			setStep("reset");
		},
		onError: (error: any) => {
			setErrors({ general: error?.message || "Verification failed. Please try again." });
		},
	});

	const resetMutation = useMutation({
		mutationFn: () => createNewPassword({
			email: formData.email.trim(),
			new_password: formData.new_password,
			confirm_new_password: formData.confirm_new_password,
		}),
		onSuccess: () => {
			setErrors({});
			setStep("done");
		},
		onError: (error: any) => {
			setErrors({ general: error?.message || "Password reset failed. Please try again." });
		},
	});

	const isLoading = requestMutation.isPending || verifyMutation.isPending || resetMutation.isPending;

	const validateEmailOnly = () => {
		const emailError = validateEmail({ email: formData.email, password: "" } as LoginRequestData);
		if (emailError) {
			setErrors(emailError);
			return false;
		}
		return true;
	};

	const validateOtp = () => {
		if (!formData.otp.trim()) {
			setErrors({ otp: "Verification code is required." });
			return false;
		}
		if (formData.otp.trim().length < 4) {
			setErrors({ otp: "Please enter a valid verification code." });
			return false;
		}
		return true;
	};

	const validateNewPassword = () => {
		const passwordError = validatePassword({ email: formData.email, password: formData.new_password } as LoginRequestData);
		if (passwordError) {
			setErrors(passwordError);
			return false;
		}
		if (!formData.confirm_new_password) {
			setErrors({ confirm_new_password: "Please confirm your password." });
			return false;
		}
		if (formData.confirm_new_password !== formData.new_password) {
			setErrors({ confirm_new_password: "Passwords do not match." });
			return false;
		}
		return true;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		if (step === "request") {
			if (!validateEmailOnly()) return;
			requestMutation.mutate();
			return;
		}

		if (step === "verify") {
			if (!validateOtp()) return;
			verifyMutation.mutate();
			return;
		}

		if (step === "reset") {
			if (!validateNewPassword()) return;
			resetMutation.mutate();
		}
	};

	const stepTitle = useMemo(() => {
		if (step === "request") return t("auth.forgotPasswordTitle");
		if (step === "verify") return t("auth.verifyCode");
		if (step === "reset") return t("auth.resetPassword");
		return t("auth.forgotPasswordTitle");
	}, [step, t]);

	return (
		<div className="min-h-screen flex flex-col lg:flex-row font-sans relative">
			<div className="absolute top-4 right-4 z-10">
				<LanguageSwitcher />
			</div>

			<BrandingPanel />

			<div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
				<MobileHeader />

				<div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
					<div className="space-y-1">
						<h3 className="text-2xl font-bold text-gray-800">{stepTitle}</h3>
						{step === "request" && (
							<p className="text-sm text-gray-500">{t("auth.forgotPasswordSubtitle")}</p>
						)}
						{step === "verify" && (
							<p className="text-sm text-gray-500">{t("auth.otpHelp")}</p>
						)}
						{step === "reset" && (
							<p className="text-sm text-gray-500">{t("auth.setNewPasswordHelp")}</p>
						)}
					</div>

					{infoMessage && (
						<div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
							{infoMessage}
						</div>
					)}

					{step === "done" ? (
						<div className="space-y-4">
							<div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
								{t("auth.passwordResetSuccess")}
							</div>
							<button
								type="button"
								onClick={() => navigate("/officials-login")}
								className="w-full py-2.5 px-4 rounded-lg bg-primary-700 text-white font-semibold text-sm shadow-md hover:bg-primary-800 transition"
							>
								{t("auth.backToLogin")}
							</button>
						</div>
					) : (
						<form onSubmit={handleSubmit} noValidate className="space-y-5">
							<div className="space-y-1">
								<label htmlFor="email" className="block text-sm font-semibold text-gray-700">
									{t("auth.usernameOrEmail")}
								</label>
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									value={formData.email}
									onChange={handleChange}
									disabled={step !== "request"}
									placeholder={t("auth.usernamePlaceholder")}
									className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
										focus:outline-none focus:ring-2 transition
										${errors.email
											? "border-red-400 bg-red-50 focus:ring-red-300"
											: "border-primary-300 bg-white focus:ring-primary-500 focus:border-green-400"
										}`}
								/>
								{errors.email && <ErrorMessage id="email-error" message={errors.email} />}
							</div>

							{step === "verify" && (
								<div className="space-y-1">
									<label htmlFor="otp" className="block text-sm font-semibold text-gray-700">
										{t("auth.otpLabel")}
									</label>
									<input
										id="otp"
										name="otp"
										type="text"
										autoComplete="one-time-code"
										value={formData.otp}
										onChange={handleChange}
										placeholder={t("auth.otpPlaceholder")}
										maxLength={8}
										className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
											focus:outline-none focus:ring-2 transition
											${errors.otp
												? "border-red-400 bg-red-50 focus:ring-red-300"
												: "border-primary-300 bg-white focus:ring-primary-500 focus:border-green-400"
											}`}
									/>
									{errors.otp && <ErrorMessage id="otp-error" message={errors.otp} />}
								</div>
							)}

							{step === "reset" && (
								<>
									<div className="space-y-1">
										<label htmlFor="new_password" className="block text-sm font-semibold text-gray-700">
											{t("auth.newPassword")}
										</label>
										<input
											id="new_password"
											name="new_password"
											type="password"
											autoComplete="new-password"
											value={formData.new_password}
											onChange={handleChange}
											placeholder={t("auth.passwordPlaceholder")}
											className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
												focus:outline-none focus:ring-2 transition
												${errors.new_password
													? "border-red-400 bg-red-50 focus:ring-red-300"
													: "border-primary-300 bg-white focus:ring-primary-500 focus:border-green-400"
												}`}
										/>
										{errors.new_password && <ErrorMessage id="new-password-error" message={errors.new_password} />}
									</div>

									<div className="space-y-1">
										<label htmlFor="confirm_new_password" className="block text-sm font-semibold text-gray-700">
											{t("auth.confirmPassword")}
										</label>
										<input
											id="confirm_new_password"
											name="confirm_new_password"
											type="password"
											autoComplete="new-password"
											value={formData.confirm_new_password}
											onChange={handleChange}
											placeholder={t("auth.confirmPassword")}
											className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
												focus:outline-none focus:ring-2 transition
												${errors.confirm_new_password
													? "border-red-400 bg-red-50 focus:ring-red-300"
													: "border-primary-300 bg-white focus:ring-primary-500 focus:border-green-400"
												}`}
										/>
										{errors.confirm_new_password && <ErrorMessage id="confirm-password-error" message={errors.confirm_new_password} />}
									</div>
								</>
							)}

							{errors.general && <AlertBanner message={errors.general} />}

							<button
								type="submit"
								disabled={isLoading}
								className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
									text-white font-semibold text-sm tracking-wide shadow-md transition duration-200 cursor-pointer
									${isLoading
										? "bg-primary-400 cursor-not-allowed"
										: "bg-primary-700 hover:bg-primary-800 active:scale-[0.98]"
									}`}
							>
								{step === "request" && t("auth.sendCode")}
								{step === "verify" && t("auth.verifyCode")}
								{step === "reset" && t("auth.resetPassword")}
							</button>

							<div className="flex items-center justify-between text-sm">
								{step === "verify" && (
									<button
										type="button"
										onClick={() => requestMutation.mutate()}
										disabled={isLoading}
										className="text-primary-700 hover:text-primary-900 hover:underline transition"
									>
										{t("auth.resendCode")}
									</button>
								)}
								<button
									type="button"
									onClick={() => navigate("/officials-login")}
									className="text-gray-500 hover:text-gray-700 hover:underline transition"
								>
									{t("auth.backToLogin")}
								</button>
							</div>
						</form>
					)}
				</div>

				<p className="mt-6 text-xs text-gray-400 text-center">
					{t("footer.copyright")}
				</p>
			</div>
		</div>
	);
};
