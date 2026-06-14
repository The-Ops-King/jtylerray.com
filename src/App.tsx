import Hero from './components/Hero';
import RealEstate from './components/RealEstate';

function App() {
  const path = window.location.pathname.replace(/\/$/, '');

  if (path === '/real-estate') {
    return (
      <main className="min-h-screen bg-bg">
        <RealEstate />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <Hero />
    </main>
  );
}

export default App;
