import { CheckCircle2, Download, ShieldCheck, Smartphone } from "lucide-react";
import maryapp from "../../../assets/maryapp.jpg";
import maryappqr from "../../../assets/maryappqr.png";

const installationSteps = [
  {
    icon: Download,
    title: "Scan the QR code",
    description: "Use your phone camera to scan the QR code and open the Mary App listing on Google Play Store.",
  },
  {
    icon: Smartphone,
    title: "Install from Google Play Store",
    description: "Tap Install on the Mary App page and wait for the app to finish downloading.",
  },
  {
    icon: CheckCircle2,
    title: "Open and sign in",
    description: "Tap Open, then sign in with your Mary App account to start submitting complaints.",
  },
];

export const MaryAppInstallPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-[#f5f7f4] text-slate-900">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div>
            <header className="mb-8 px-1 sm:px-3">
              <div className="flex items-center gap-3">
                <img src={maryapp} alt="Mary App logo" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#d6e6d8]" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#17643b]">Mary App</p>
                  <p className="mt-1 text-xs text-slate-500">Mobile application</p>
                </div>
              </div>
              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-[#123d2b] sm:text-5xl">Submit complaints from your phone.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Report community concerns through Mary App and track your complaint from submission to resolution.</p>
            </header>

            

          <section className="px-1 sm:px-3" aria-labelledby="install-title">
            <h2 id="install-title" className="text-2xl font-bold text-[#123d2b]">Installation steps</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Three steps to start submitting complaints.</p>
            <ol className="mt-6 space-y-10">
              {installationSteps.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="flex gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#edf0ff] text-xs font-bold text-[#4b4be8]">{index + 1}</span>
                  <div>
                    <h4 className="flex items-center gap-2 font-bold text-slate-700"><Icon className="h-4 w-4 shrink-0 text-[#17643b]" />{title}</h4>
                    <p className="mt-1 leading-5 text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          </div>
            <section className="px-1 sm:px-3" aria-labelledby="android-title">
            <div className="mb-8 flex items-start gap-3">
              <Smartphone className="mt-1 h-6 w-6 shrink-0 text-[#17643b]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c25b35]">Available on Google Play</p>
                <h2 id="android-title" className="mt-2 text-2xl font-bold text-[#123d2b]">Install Mary App</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Requires Android 7.0 or newer.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 text-center">
              <img src={maryappqr} alt="QR code to download Mary App from Google Play Store" className="h-52 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" />
              <p className="max-w-xs text-sm leading-6 text-slate-600">Scan the QR code to download Mary App from the Google Play Store.</p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="flex gap-3 rounded-lg bg-[#edf7ef] px-4 py-3 text-sm leading-5 text-[#17643b]" role="note">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p><strong>Download safely from Google Play.</strong> Mary App is officially available through the Play Store for the Municipality of Sta. Maria, Laguna.</p>
              </div>
            </div>
            </section>
        </div>
      </div>
    </main>
  );
};
