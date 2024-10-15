"use client";

import { useEffect, useRef, useState } from "react";
import { AppFlowEntry, NextEntry } from "@/pages/dashboard";

export interface ClientProps {
  selectedEntry: AppFlowEntry;
  initialURL: string;
}

export default function Home({ selectedEntry, initialURL }: ClientProps) {
  const [currentlyOpenAssessmentURL, setCurrentlyOpenAssessmentURL] = useState<string | null>(() => {
    const url = new URL(initialURL, window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  });
  const currentURLIndex = useRef<number>(0);

  console.log('Selected Entry', selectedEntry);
  console.log('Initial URL', initialURL);

  useEffect(() => {
    const handleMessage = (event: any) => {
      console.log('Message Received', event);
      if (event.origin !== 'https://assessmentdev.curiouscontent.org') {
        return;
      }
      const { type, score } = event.data;
      console.log('Type', type);
      console.log('Score', score);
      console.log('Conditional', selectedEntry.flow[currentURLIndex.current + 1].conditional);

      if (currentURLIndex.current + 1 < selectedEntry.flow.length) {
        // We are going to check if the condition is met for the next url if it exists, if not do nothing
        if (score > selectedEntry.flow[currentURLIndex.current + 1].conditional) {
          currentURLIndex.current = currentURLIndex.current + 1; // Move to the next entry
          const nextURL = selectedEntry.flow[currentURLIndex.current]?.url; // Assuming next entry is at index 1
          const redirect = selectedEntry.flow[currentURLIndex.current]?.redirect; // Check if the next entry is a redirect or not
          if (nextURL) {
            if (redirect) {
              window.location.href = nextURL!;
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
      {
        currentlyOpenAssessmentURL?.includes('google') ? ( "Redirecting to play store..." ) : (
          <iframe src={currentlyOpenAssessmentURL!} className="min-w-full min-h-full" />
        )
      }
    </main>
  );
}