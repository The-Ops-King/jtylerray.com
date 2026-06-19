import Hero from './components/Hero';
import RealEstate from './components/RealEstate';
import Apply from './components/Apply';

function App() {
  const path = window.location.pathname.replace(/\/$/, '');

  if (path === '/real-estate') {
    return (
      <main className="min-h-screen bg-bg">
        <RealEstate />
      </main>
    );
  }

  if (path === '/apply') {
    return (
      <main className="min-h-screen bg-bg">
        <Apply />
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
