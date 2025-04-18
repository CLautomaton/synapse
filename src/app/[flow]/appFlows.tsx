"use client";

import { useEffect, useRef, useState } from "react";
import { AppFlowEntry, NextEntry } from "@/pages/dashboard";

export interface ClientProps {
  selectedEntry: AppFlowEntry;
  initialURL: string;
}

interface FullscreenComponentProps {
  title: string;
  appsIds: string[];
}

export default function AppFlowDisplay({ selectedEntry, initialURL }: ClientProps) {
  console.log('App flow display initialiazing...', selectedEntry);
  const [currentlyOpenAssessmentURL, setCurrentlyOpenAssessmentURL] = useState<string | null>(null);
  const currentURLIndex = useRef<number>(0);

  useEffect(() => {
    // Calculate the initial URL on the client side
    const url = new URL(initialURL, window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    setCurrentlyOpenAssessmentURL(url.toString());
  }, [initialURL]);

  useEffect(() => {
    const handleMessage = (event: any) => {
      console.log('Message Received', event);
      if (event.origin !== 'https://assessmentdev.curiouscontent.org' && event.origin !== 'https://assessment.curiouscontent.org') {
        return;
      }
      const { type, score } = event.data;
      console.log('Type', type);
      console.log('Score', score);
      console.log('Conditional', selectedEntry.flow[currentURLIndex.current + 1].conditional);

      if (currentURLIndex.current + 1 < selectedEntry.flow.length) {
        // Check if the condition is met for the next URL
        if (score > selectedEntry.flow[currentURLIndex.current + 1].conditional) {
          
          currentURLIndex.current = currentURLIndex.current + 1; // Move to the next entry
          const nextURL = selectedEntry.flow[currentURLIndex.current]?.url;
          const redirect = selectedEntry.flow[currentURLIndex.current]?.redirect;

          if (nextURL) {
            if (redirect) {
              window.location.href = nextURL;
            } else {
              const url = new URL(nextURL, window.location.href);
              const currentParams = new URLSearchParams(window.location.search);
              currentParams.forEach((value, key) => {
                url.searchParams.set(key, value);
              });
              setCurrentlyOpenAssessmentURL(url.toString());
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedEntry.flow]);

  return (
    <main className="flex min-h-screen bg-[#3d85d1]">

      { currentlyOpenAssessmentURL?.includes('google') ? (
        "Redirecting to play store..."
      ) : (
        <iframe src={currentlyOpenAssessmentURL!} className="min-w-full min-h-full" />
      )}
    </main>
  );
}
