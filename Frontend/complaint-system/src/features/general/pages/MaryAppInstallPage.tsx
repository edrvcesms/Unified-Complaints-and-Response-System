import { CheckCircle2, Download, FolderOpen, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import maryapp from "../../../assets/maryapp.jpg";

const installationSteps = [
  {
    icon: Download,
    title: "Tap the download button",
    description: 'Your browser may ask you to confirm the download. Choose "Download anyway" or "Keep" when the APK is available.',
  },
  {
    icon: FolderOpen,
    title: "Open the downloaded file",
    description: "Tap the download notification, or open your Files app and look inside the Downloads folder for MaryApp.apk.",
  },
  {
    icon: LockKeyhole,
    title: "Allow installs from your browser",
    description: 'Android may ask you to open Settings. Turn on "Allow from this source" for the browser you downloaded with, then go back.',
  },
  {
    icon: CheckCircle2,
    title: "Install, then open",
    description: "Tap Install and wait a few seconds. When it finishes, tap Open and sign in with your Mary App account.",
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

            <section className="px-1 sm:px-3" aria-labelledby="android-title">
            <div className="mb-8 flex items-start gap-3">
              <Smartphone className="mt-1 h-6 w-6 shrink-0 text-[#17643b]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c25b35]">Android download</p>
                <h2 id="android-title" className="mt-2 text-2xl font-bold text-[#123d2b]">Install Mary App</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Requires Android 7.0 or newer.</p>
              </div>
            </div>

            <button type="button" disabled title="The APK will be available here soon" className="mx-auto flex w-fit cursor-not-allowed items-center gap-2 rounded-lg bg-[#17643b] px-5 py-3.5 text-sm font-bold text-white opacity-60">
              <Download className="h-4 w-4" />
              APK coming soon
            </button>
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="flex gap-3 rounded-lg bg-[#edf7ef] px-4 py-3 text-sm leading-5 text-[#17643b]" role="note">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p><strong>This is safe to install.</strong> Android may show an unknown developer warning because the app is dedicated to the Municipality of Sta. Maria, Laguna.</p>
              </div>
            </div>
            </section>
          </div>

          <section className="px-1 sm:px-3" aria-labelledby="install-title">
            <h2 id="install-title" className="text-2xl font-bold text-[#123d2b]">Installation steps</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Four steps to start submitting complaints.</p>
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
      </div>
    </main>
  );
};
