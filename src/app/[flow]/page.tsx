import { AppFlowEntry } from "@/pages/dashboard";
import { notFound } from "next/navigation";
import Home from "./client-component";
import { adminDB } from "@/config/firebaseAdmin";

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

const ServerComponent = async ({ params }: { params: { flow: string } }) => {
  const { flow } = params;
  const selectedEntry = await getFlowByFlowName(flow);
  console.log(selectedEntry);
  console.log('Received flow parameter:', flow);

  if (!selectedEntry) {
    notFound();
  }

  const initialURL = selectedEntry.flow[0]?.url || '';

  // Pass data to the client-side component
  return (
    <Home initialURL={initialURL} selectedEntry={selectedEntry} />
  );
};

export default ServerComponent;