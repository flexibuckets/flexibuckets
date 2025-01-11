'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Folder, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HoverEffect } from '@/components/ui/card-hover-effect';
import { HeroHighlight, Highlight } from '@/components/ui/hero-highlight';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/navigation/Footer';


const AnimatedText = ({ children }: { children: React.ReactNode }) => (
  <motion.span
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.span>
);

const BucketWithFiles = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mt-8"
    >
      <motion.div
        className={`absolute inset-x-0 bottom-0 h-36 sm:h-48 ${
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        } rounded-3xl overflow-hidden`}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <motion.div
          className={`absolute inset-x-0 top-0 h-8 sm:h-12 ${
            isDark ? 'bg-zinc-700' : 'bg-zinc-300'
          } rounded-t-3xl`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute inset-0 flex flex-wrap justify-center items-end p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`folder-${i}`}
              className={`w-8 h-12 sm:w-12 sm:h-16 ${
                isDark
                  ? 'bg-yellow-700 border-yellow-600'
                  : 'bg-yellow-100 border-yellow-400'
              } border rounded-sm m-1 flex items-center justify-center`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
            >
              <Folder
                className={`w-4 h-4 sm:w-6 sm:h-6 ${
                  isDark ? 'text-yellow-400' : 'text-yellow-600'
                }`}
              />
            </motion.div>
          ))}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`file-${i}`}
              className={`w-8 h-12 sm:w-12 sm:h-16 ${
                isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-400'
              } border rounded-sm m-1 flex items-center justify-center`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.3 + i * 0.1 }}
            >
              <FileText
                className={`w-4 h-4 sm:w-6 sm:h-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <motion.div
        className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-16 sm:w-20 h-6 sm:h-8 ${
          isDark ? 'bg-gray-600' : 'bg-gray-400'
        } rounded-t-full`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      />
    </motion.div>
  );
};

const projects = [
  {
    title: 'Your S3 Bucket 🏖️',
    description:
      "BYOB: It's not just for parties anymore. Bring Your Own Bucket and keep your data close. No more data sandcastles!",
  },
  {
    title: 'Swift Uploads 🚀',
    description:
      "Upload faster than you can say 'Where did I put that file?' No more bucket-kicking frustration! It's a file fiesta!",
  },
  {
    title: 'Sharing is Caring 🤝',
    description:
      "Share files smoother than a well-oiled bucket handle. No spills, no thrills, just easy sharing. It's a data pool party!",
  },
  {
    title: 'Bucket List Search 🔍',
    description:
      "Find your files faster than finding a drop in a... well, you know. Our search is that good! It's like a treasure hunt, minus the wet sand.",
  },
  {
    title: 'Fort Knox Security 🔒',
    description:
      "Your bucket is locked down tighter than a submarine hatch. Not even a drop gets through! It's like a digital life jacket for your data.",
  },
  {
    title: 'Plays Well with Others ☁️',
    description:
      "We're like the Switzerland of buckets. Neutral and compatible with AWS, Backblaze, Wasabi, and more! It's a cloud party, and everyone's invited!",
  },
];

function CardHoverEffectDemo() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={projects} />
    </div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`flex flex-col min-h-screen ${
        theme === 'dark'
          ? 'bg-zinc-950 text-zinc-100'
          : 'bg-white text-zinc-900'
      }`}
    >
      <Navbar />
      <main className="flex-1">
        <HeroHighlight>
          <section className="relative w-full min-h-[calc(100vh-3.5rem)] flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ duration: 1 }}
              className={`absolute inset-0 ${
                theme === 'dark'
                  ? 'bg-[url("/dark-placeholder.svg")]'
                  : 'bg-[url("/light-placeholder.svg")]'
              } bg-cover bg-center`}
            />
            <div className="container relative z-10 mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-8 text-center">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
                >
                  BYOB: Bring Your Own Bucket
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="max-w-[700px] text-lg sm:text-xl md:text-2xl"
                >
                  Don&apos;t let your files go with the flow.
                  <Highlight className="text-white">
                    Bucket up and take control!
                  </Highlight>
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <HoverBorderGradient
                    className={`relative w-full ${
                      theme === 'dark'
                        ? 'bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700/90'
                        : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/90'
                    } transition-all`}
                  >
                    <Link
                      href="/signup"
                      className="flex items-center justify-center"
                    >
                      Get Started 💦
                      <ArrowRight
                        className={`ml-2 h-5 w-5 ${
                          theme === 'dark' ? 'text-zinc-100' : 'text-zinc-100'
                        }`}
                      />
                    </Link>
                  </HoverBorderGradient>
                </motion.div>
                <BucketWithFiles />
              </div>
            </div>
          </section>
        </HeroHighlight>
        <Footer />
      </main>
    </div>
  );
}
