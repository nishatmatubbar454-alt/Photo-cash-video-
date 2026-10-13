/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, ChevronDown, Play, Sparkles } from 'lucide-react';

interface AdSlotProps {
  index: number;
}

function AdBanner300x250({ index }: AdSlotProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 300px;
      height: 250px;
      overflow: hidden;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="container-3359dfb49d3904ef22e968fbd601bd0f"></div>
  <script async="async" data-cfasync="false" src="https://bauval.org/21/3359dfb49d3904ef22e968fbd601bd0f"></script>
</body>
</html>`);
      doc.close();
    } catch (err) {
      console.error(`Error loading ad in slot ${index}:`, err);
    }
  }, [index]);

  return (
    <div className="w-[300px] h-[250px] bg-slate-50 border border-slate-200/90 rounded-xl overflow-hidden shadow-xs shrink-0 mx-auto flex items-center justify-center">
      <iframe
        ref={iframeRef}
        title={`300x250 Banner Slot ${index}`}
        className="w-[300px] h-[250px] border-0 block"
        scrolling="no"
      />
    </div>
  );
}

export default function App() {
  const videoId = '1235125945';
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Send message to Vimeo iframe to unmute, set max volume and play
  const triggerSoundAndPlay = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"method":"setMuted","value":false}', '*');
      iframeRef.current.contentWindow.postMessage('{"method":"setVolume","value":1}', '*');
      iframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
      setHasInteracted(true);
    }
  };

  const scrollToVideo = (behavior: ScrollBehavior = 'smooth') => {
    if (videoSectionRef.current) {
      videoSectionRef.current.scrollIntoView({
        behavior,
        block: 'center',
      });
      triggerSoundAndPlay();
    }
  };

  // Automatically scroll to the video section smoothly on page load
  useEffect(() => {
    // Quick attempt after DOM ready
    const timer1 = setTimeout(() => {
      scrollToVideo('smooth');
    }, 600);

    // Follow-up adjustment in case ad frames expanded page height
    const timer2 = setTimeout(() => {
      scrollToVideo('smooth');
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Set up listeners: user scrolling, tapping or clicking will trigger unmuted sound
  useEffect(() => {
    const handleUserGesture = () => {
      triggerSoundAndPlay();
    };

    window.addEventListener('scroll', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  // IntersectionObserver to trigger play when video enters view
  useEffect(() => {
    if (!videoSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerSoundAndPlay();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(videoSectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Direct unmuted autoplay iframe URL
  const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&loop=1&autopause=0&badge=0&player_id=0&app_id=58479`;

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col items-center">
      {/* Top Floating Quick Scroll Pill */}
      <div className="sticky top-2 z-40 my-2">
        <button
          onClick={() => scrollToVideo('smooth')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>সরাসরি ভিডিওতে যান</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </button>
      </div>

      {/* Top Ads: 10 Banners (300x250) */}
      <section className="w-full max-w-7xl px-4 py-6">
        <div className="text-center mb-4">
          <span className="text-xs text-slate-400 font-medium">বিজ্ঞাপন (উপরে ১০টি ব্যানার)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
          {Array.from({ length: 10 }).map((_, idx) => (
            <AdBanner300x250 key={`top-ad-slot-${idx}`} index={idx + 1} />
          ))}
        </div>
      </section>

      {/* Main Video Stage */}
      <section
        ref={videoSectionRef}
        id="video-player-container"
        className="w-full max-w-5xl px-4 my-8 scroll-mt-20"
      >
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-black">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            allowFullScreen
            title="Vimeo Video Player"
          />

          {/* Quick Sound Toggle overlay if browser restricts initial audio */}
          {!hasInteracted && (
            <button
              onClick={triggerSoundAndPlay}
              className="absolute top-4 right-4 z-20 px-3.5 py-2 bg-slate-900/95 hover:bg-black text-white rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
              title="সাউন্ড শুনুন"
            >
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>সাউন্ড চালু করুন (Unmute)</span>
            </button>
          )}
        </div>
      </section>

      {/* Bottom Ads: 5 Banners (300x250) */}
      <section className="w-full max-w-7xl px-4 py-8">
        <div className="text-center mb-4">
          <span className="text-xs text-slate-400 font-medium">বিজ্ঞাপন (নিচে ৫টি ব্যানার)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
          {Array.from({ length: 5 }).map((_, idx) => (
            <AdBanner300x250 key={`bottom-ad-slot-${idx}`} index={idx + 11} />
          ))}
        </div>
      </section>
    </div>
  );
}
