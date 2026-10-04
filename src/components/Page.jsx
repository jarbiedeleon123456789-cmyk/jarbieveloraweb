import { motion } from 'framer-motion';
import Navbar from './Navbar';
import { TLink } from '../transition';

export default function Page({ children, className = '' }) {
  return (
    <div className="page">
      <Navbar />
      <motion.main
        className={'page-main ' + className}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        {children}
      </motion.main>
      <footer className="footer">
        <TLink to="/" className="logo">VELORA</TLink>
        <span>Premium car parts · Genuine · Tested · Shipped fast</span>
      </footer>
    </div>
  );
}

export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}
