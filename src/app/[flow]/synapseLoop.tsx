"use client";

import { useEffect, useRef, useState } from "react";
import { AppFlowEntry, NextEntry } from "@/pages/dashboard";

export interface ClientProps {
  selectedEntry: AppFlowEntry;
  initialURL: string;
}

interface AppEntry {
  id: string;
  url: string;
  imageURL: string;
}

interface AppContent {
  apps: AppEntry[];
}

const appContent: AppContent = {
  apps: [
    {
        id: "the-lost-doll",
        url: "https://assessmentdev.curiouscontent.org/?data=hausa-lettersounds",
        imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/ftm_TheLostDoll_dev.png"
    },
    {
        id: "lets-fly",
        url: "https://assessmentdev.curiouscontent.org/?data=french-lettersounds",
        imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/LetsFly_dev.png"
    },
    {
        id: "market",
        url: "https://assessmentdev.curiouscontent.org/?data=bangla-lettersounds",
        imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/my_first_day_at_the_market.png"
    },
    {
        id: "frog",
        url: "https://assessmentdev.curiouscontent.org/?data=french-lettersounds",
        imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/frogs_starry_wish.png"
    }
  ]
};

interface FullscreenComponentProps {
  title: string;
  appsIds: string[];
}

const FullscreenComponent: React.FC<FullscreenComponentProps & { onImageClick: (url: string) => void }> = ({ title, appsIds, onImageClick }) => {
  const apps = appsIds.map(id => appContent.apps.find(app => app.id === id)).filter(app => app !== undefined);
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-5">{title}</h1>
      <div className="flex flex-col w-6/12 p-5 gap-10">
        {apps.map((app, index) => (
          <button key={index} onClick={() => onImageClick(app.url)}>
            <img className="border-4 border-transparent border-r-indigo-500 border-b-purple-500" src={app.imageURL} alt={app.id} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default function SynapseLoop({ selectedEntry, initialURL }: ClientProps) {
  console.log('Synapse Loop initialiazing...', selectedEntry);
  const [currentlyOpenAssessmentURL, setCurrentlyOpenAssessmentURL] = useState<string | null>(null);
  const currentURLIndex = useRef<number>(0);

  const [appDisplayActive, setAppDisplayActive] = useState<boolean>(false);
  const [appIdsToDisplay, setAppIdsToDisplay] = useState<string[]>(['frog', 'market']);
  const [appDisplayTitle, setAppDisplayTitle] = useState<string>('Sounds');

  const handleAppClick = (url: string) => {
    setAppDisplayActive(false);
    setCurrentlyOpenAssessmentURL(url);
  }

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
          // Activate the fullscreen display here
          setAppDisplayActive(true);
          setAppIdsToDisplay(['the-lost-doll', 'lets-fly']);
          setAppDisplayTitle('Words');
        //   currentURLIndex.current = currentURLIndex.current + 1; // Move to the next entry
        //   const nextURL = selectedEntry.flow[currentURLIndex.current]?.url;
        //   const redirect = selectedEntry.flow[currentURLIndex.current]?.redirect;

        //   if (nextURL) {
        //     if (redirect) {
        //       window.location.href = nextURL;
        //     } else {
        //       const url = new URL(nextURL, window.location.href);
        //       const currentParams = new URLSearchParams(window.location.search);
        //       currentParams.forEach((value, key) => {
        //         url.searchParams.set(key, value);
        //       });
        //       setCurrentlyOpenAssessmentURL(url.toString());
        //     }
        //   }
        } else {
          setAppDisplayActive(true);
          setAppIdsToDisplay(['frog', 'market']);
          setAppDisplayTitle('Sounds');
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

      {appDisplayActive ? (
        <FullscreenComponent title={appDisplayTitle} appsIds={appIdsToDisplay} onImageClick={(url) => handleAppClick(url)} />
      ) : currentlyOpenAssessmentURL?.includes('google') ? (
        "Redirecting to play store..."
      ) : (
        <iframe src={currentlyOpenAssessmentURL!} className="min-w-full min-h-full" />
      )}
    </main>
  );
}