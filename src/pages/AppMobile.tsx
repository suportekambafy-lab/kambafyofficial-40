console.log('📱 AppMobile module loaded');

export default function AppMobile() {
  console.log('📱 AppMobile rendering');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl p-4">
          <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-4">kambafy</h1>
        <p className="text-white/80">Versão App Mobile</p>
      </div>
    </div>
  );
}
