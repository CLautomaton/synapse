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
      id: "ftm-westAfricanEnglish",
      url: "https://feedthemonsterdev.curiouscontent.org/?cr_lang=englishwestafrican",
      imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/ftm_englishwestafrican_dev.png",
    },
    {
      id: "letterSounds-westAfricanEnglish",
      url: "https://assessmentdev.curiouscontent.org/?data=west-african-english-lettersounds",
      imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/assessment_icon_dev.png",
    },
    {
      id: "sightWords-westAfricanEnglish",
      url: "https://assessmentdev.curiouscontent.org/?data=west-african-sightwords",
      imageURL:
        "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/assessment_icon_sight_word_dev.png",
    },
    {
      id: "book-coloursLevel2En",
      url: "https://curiousreaderdev.curiouscontent.org/?book=ColoursLevel2En",
      imageURL: "https://devcuriousreader.wpcomstaging.com/container_app_manifest/icons/ftm_Colours_dev.png",
    },
  ],
};

interface FullscreenComponentProps {
  title: string;
  appsIds: string[];
}

const FullscreenComponent: React.FC<FullscreenComponentProps & { onImageClick: (url: string) => void }> = ({
  title,
  appsIds,
  onImageClick,
}) => {
  const apps = appsIds.map((id) => appContent.apps.find((app) => app.id === id)).filter((app) => app !== undefined);
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-5">{title}</h1>
      <div className="flex flex-col w-6/12 p-5 gap-10 justify-center items-center">
        {apps.map((app, index) => (
          <button key={index} onClick={() => onImageClick(app.url)}>
            <img
              className="border-4 border-transparent border-r-indigo-500 border-b-purple-500 w-80 h-80"
              src={app.imageURL}
              alt={app.id}
            />
            <p>{app.id}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function SynapseLoop({ selectedEntry, initialURL }: ClientProps) {
  console.log("Synapse Loop initialiazing...", selectedEntry);
  const [currentlyOpenAssessmentURL, setCurrentlyOpenAssessmentURL] = useState<string | null>(null);
  const currentURLIndex = useRef<number>(0);

  const [appDisplayActive, setAppDisplayActive] = useState<boolean>(false);
  const [appIdsToDisplay, setAppIdsToDisplay] = useState<string[]>(["frog", "market"]);
  const [appDisplayTitle, setAppDisplayTitle] = useState<string>("Sounds");

  const handleAppClick = (url: string) => {
    setAppDisplayActive(false);
    setCurrentlyOpenAssessmentURL(url);
  };

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
      console.log("Message Received", event);
      if (
        event.origin !== "https://assessmentdev.curiouscontent.org" &&
        event.origin !== "https://assessment.curiouscontent.org"
      ) {
        return;
      }
      const { type, score } = event.data;
      console.log("Type", type);
      console.log("Score", score);
      // console.log("Conditional", selectedEntry.flow[currentURLIndex.current + 1].conditional);

      if (currentURLIndex.current + 1 < selectedEntry.flow.length) {
        // Check if the condition is met for the next URL
        if (score > selectedEntry.flow[currentURLIndex.current + 1].conditional) {
          // Activate the fullscreen display here
          
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
        } else {
          // This is for the demo, if the user gets below 80% score we show the sounds display
          setAppDisplayActive(true);
          setAppIdsToDisplay(["ftm-westAfricanEnglish", "letterSounds-westAfricanEnglish"]);
          setAppDisplayTitle("Sounds");
        }
      } else if (currentURLIndex.current + 1 >= selectedEntry.flow.length) {
        // This is for the demo, if the user gets below 80% score we show the sounds display
        setAppDisplayActive(true);
        setAppIdsToDisplay(["book-coloursLevel2En", "sightWords-westAfricanEnglish"]);
        setAppDisplayTitle("Words");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [selectedEntry.flow]);

  return (
    <main className={`flex min-h-screen ${currentlyOpenAssessmentURL?.includes("?book") ? "bg-white" : "bg-[#3d85d1]"}`}>
      {appDisplayActive ? (
        <FullscreenComponent
          title={appDisplayTitle}
          appsIds={appIdsToDisplay}
          onImageClick={(url) => handleAppClick(url)}
        />
      ) : currentlyOpenAssessmentURL?.includes("google") ? (
        "Redirecting to play store..."
      ) : (
        <iframe src={currentlyOpenAssessmentURL!} className="min-w-full min-h-full" />
      )}
    </main>
  );
}
