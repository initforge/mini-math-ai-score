import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

