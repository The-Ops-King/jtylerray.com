import Hero from './components/Hero';

/**
 * The old landing page, served at /legacy.
 *
 * It used to route /apply and /real-estate to their own screens. Both of those
 * paths have been permanently redirected to / in vercel.json since the
 * applications were retired, so neither branch could run and both screens have
 * been deleted. What is left is the page itself.
 */
function App() {
  return (
    <main className="min-h-screen bg-bg">
      <Hero />
    </main>
  );
}

export default App;
