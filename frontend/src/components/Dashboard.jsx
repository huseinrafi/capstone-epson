export default function Dashboard() {
  return (
    <div className="w-full p-6 overflow-y-auto">
      <h2 className="text-xl font-bold text-[#002060] mb-4">Hi, Aris Setiawan!</h2>
      <p className="text-sm text-gray-600 mb-6">Station ID: INBOUND-1 | Role: Operator</p>
      
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-[#EBECEF] p-4 text-center rounded-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-bold tracking-wider mb-1">PENDING</p>
          <p className="text-4xl font-bold text-[#002060]">01</p>
        </div>
        <div className="bg-[#EBECEF] p-4 text-center rounded-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-bold tracking-wider mb-1">ACTIVE</p>
          <p className="text-4xl font-bold text-[#7F2B12]">02</p>
        </div>
      </div>
    </div>
  );
}