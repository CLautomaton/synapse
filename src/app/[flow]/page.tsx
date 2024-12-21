import { AppFlowEntry } from "@/pages/dashboard";
import { notFound } from "next/navigation";
import { adminDB } from "@/config/firebaseAdmin";
import AppFlowDisplay from "./appFlows";
import SynapseLoop from "./synapseLoop";
import IrisDisplay from "./irisDisplay";

const fetchEntries = async (): Promise<AppFlowEntry[]> => {
  const docRef = adminDB.collection('ContentMover').doc('appFlowsDoc');
  const docSnapshot = await docRef.get();
  
  if (!docSnapshot.exists) {
    console.error('AppFlows document does not exist');
    return [];
  }

  const data = docSnapshot.data();
  console.log("Received data: " );
  console.log("Received data:", data);
  return (data?.appFlows || []) as AppFlowEntry[];
};

const getFlowByFlowName = async (flow: string): Promise<AppFlowEntry | null> => {
  const entries = await fetchEntries();
  return entries.find(entry => entry.id === flow) || null;
};

const ServerComponent = async ({ params, searchParams }: { 
  params: { flow: string }, 
  searchParams: { apps?: string, start?: string }
}) => {
  const { flow } = params;
  const appsParam = searchParams?.apps?.split('=')[1] || '';
  const appsList = appsParam.split(',').filter((app) => app);
  const startParam = searchParams?.start?.split('=')[1] || '';
  const startingIndex = parseInt(startParam, 10) || 0;

  console.log('Received apps parameter:', appsParam);

  const selectedEntry = await getFlowByFlowName(flow);
  console.log(selectedEntry);
  console.log('Received flow parameter:', flow);

  if (!selectedEntry) {
    notFound();
  }

  const initialURL = selectedEntry.flow[startParam !== undefined ? startingIndex : 0]?.url || '';

  // Pass data to the client-side component
  return <>
    { appsList.length > 0 ? <IrisDisplay appsList={appsList} /> : 
      flow === 'loop-mvp' && appsList.length === 0 ? <SynapseLoop initialURL={initialURL} selectedEntry={selectedEntry} /> : 
      <AppFlowDisplay initialURL={initialURL} selectedEntry={selectedEntry} /> }
  </>;
};

export default ServerComponent;