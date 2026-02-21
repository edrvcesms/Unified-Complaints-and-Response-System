import StaMariaLogo from "../../../assets/StaMariaLogo.jpg";

// ─── Component: MobileHeader ──────────────────────────────────────────────────
// Compact branding shown at the top of the form on small screens (hidden on lg+).

export const MobileHeader: React.FC = () => (
  <div className="flex lg:hidden flex-col items-center text-center mb-8 space-y-3">
    <div className="w-20 h-20 rounded-full border-4 border-blue-700 shadow-lg overflow-hidden bg-white">
      <img src={StaMariaLogo} alt="Sta. Maria, Laguna Seal" className="w-full h-full object-cover" />
    </div>
    <div>
      <h1 className="text-xl font-extrabold text-blue-800">Sta. Maria, Laguna</h1>
      <p className="text-sm text-gray-500 font-medium">Unified Complaints and Response System</p>
    </div>
  </div>
);