import Header from '../common/Header';
import Hero from './Hero';
import FeatureTabs from './FeatureTabs';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Header />
      <Hero />
      <FeatureTabs />
    </div>
  );
}

