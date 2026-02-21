import StaMariaLogo from "../../../assets/StaMariaLogo.jpg";;

// ─── Component: BrandingPanel ─────────────────────────────────────────────────
// Full-height left panel shown only on large screens (lg+).
// Displays the municipal seal, system name, and a brief description.

export const BrandingPanel: React.FC = () => (
  <div
    className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
    style={{ background: "linear-gradient(160deg, #003087 0%, #0055b3 60%, #0077cc 100%)" }}
  >
    {/* Decorative background circles for depth */}
    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white" />
    <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10 bg-white" />

    <div className="relative z-10 flex flex-col items-center text-center px-12 space-y-6">
      {/* Municipal seal */}
      <div className="w-36 h-36 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
        <img
          src={StaMariaLogo}
          alt="Bayan ng Santa Maria, Laguna Seal"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title block */}
      <div className="text-white space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold text-blue-200">
          Republic of the Philippines
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight drop-shadow">
          Sta. Maria, Laguna
        </h1>
        <h2 className="text-xl font-semibold text-blue-100">
          Unified Complaints and Response System
        </h2>
        <div className="w-16 h-1 bg-white mx-auto rounded-full mt-3" />
      </div>

      <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
        A unified digital platform for barangay officials to efficiently
        file, track, and resolve community complaints.
      </p>
    </div>
  </div>
);