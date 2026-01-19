export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-green-500">SYSTEM ONLINE</h1>
        <p className="text-gray-500">ZeroKeep Enterprise Server</p>
        <div className="mt-8 flex justify-center space-x-4 text-xs tracking-widest text-gray-600">
          <span>STATUS: GREEN</span>
          <span>REGION: ID</span>
          <span>ENCRYPTION: AES-256</span>
        </div>
      </div>
    </div>
  );
}
