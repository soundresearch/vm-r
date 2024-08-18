import './App.css';
import VendingMachine from './components/VendingMachine';

function App() {
  return (
    <div className="bg-blue-100 h-screen w-vh flex items-center justify-center flex-col overflow-hidden">
      <div className="w-full h-full">
        <VendingMachine />
      </div>
    </div>
  );
}

export default App;
