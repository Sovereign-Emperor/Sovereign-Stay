import { ArrowRight, Compass, Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { imageUrl } from "../data/properties";

const values = [
  { icon: <Compass size={20} />, title: "Discovery, made easier.", text: "See the details that matter, all in one place. Less chasing leads, more finding your fit." },
  { icon: <ShieldCheck size={20} />, title: "Clarity before commitment.", text: "Prices, facilities, and availability deserve to be clear. Our examples show what a better search can feel like." },
  { icon: <Heart size={20} />, title: "Built around student life.", text: "A thoughtful place to live makes everything else feel a little more possible. That’s who we’re building for." },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="container about-hero-inner">
          <div><p className="eyebrow"><span className="tiny-spark">✳</span> A LITTLE ABOUT US</p><h1>Finding home<br />should feel <em>hopeful.</em></h1><p>Not like a scavenger hunt. We’re here to make the search for student accommodation feel clearer, more visual, and a little more human.</p></div>
          <div className="about-hero-image"><img src={imageUrl("photo-1524758631624-e2822e304c36", 1200)} alt="A warm, welcoming shared living space" /><span>PHOTO FOR ILLUSTRATION</span><div className="image-stamp"><Sparkles size={17} /><span>MADE FOR<br />STUDENT LIFE</span></div></div>
        </div>
      </section>
      <section className="about-mission section-pad">
        <div className="container mission-grid">
          <p className="eyebrow"><MapPin size={15} /> OUR STARTING POINT</p>
          <div><h2>Rooted in <em>Koforidua.</em><br />Made with students in mind.</h2><p>Finding somewhere to live near campus can mean scattered messages, unclear prices, and too many trips just to see a room. Sovereign Stay starts with a simple idea: bring the useful details together so students can explore their options with a little more confidence.</p><p>We’re starting around Koforidua Technical University, with a long way to go and plenty to learn from the people who know this search best: students, landlords, and local property managers.</p><Link className="text-link" to="/">Explore the demo stays <ArrowRight size={16} /></Link></div>
        </div>
      </section>
      <section className="about-values">
        <div className="container"><p className="eyebrow">WHAT WE BELIEVE</p><h2>A better search starts<br />with <em>the right things.</em></h2><div className="value-grid">{values.map((value, index) => <article className="value-card" key={value.title}><span className="value-number">0{index + 1}</span><span className="value-icon">{value.icon}</span><h3>{value.title}</h3><p>{value.text}</p></article>)}</div></div>
      </section>
      <section className="about-honesty"><div className="container honesty-inner"><div><p className="eyebrow">A NOTE ON THIS DEMO</p><h2>Honest from<br /><em>the beginning.</em></h2></div><div><p>This first version uses demonstration properties and illustrative photos to show how the experience could work. These are not verified real-world listings, and prices, availability, ratings, and provider details are examples only.</p><p>We believe a useful accommodation search starts with clear, trustworthy information. Real listings should be added only when they’re ready to be checked.</p><Link className="text-link" to="/">Take a look around <ArrowRight size={16} /></Link></div></div></section>
    </main>
  );
}
