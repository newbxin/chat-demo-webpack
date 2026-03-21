import thread1 from './21cfea46-34bd-4aa6-9e1f-3009452fbeb9/thread.json';
import thread2 from './3823e443-4e2b-4679-b496-a9506eae462b/thread.json';
import thread3 from './4f3e55ee-f853-43db-bfb3-7d1a411f03cb/thread.json';
import thread4 from './5aa47db1-d0cb-4eb9-aea5-3dac1b371c5a/thread.json';
import thread5 from './7cfa5f8f-a2f8-47ad-acbd-da7137baf990/thread.json';
import thread6 from './7f9dc56c-e49c-4671-a3d2-c492ff4dce0c/thread.json';
import thread7 from './90040b36-7eba-4b97-ba89-02c3ad47a8b9/thread.json';
import thread8 from './ad76c455-5bf9-4335-8517-fc03834ab828/thread.json';
import thread9 from './b83fbb2a-4e36-4d82-9de0-7b2a02c2092a/thread.json';
import thread10 from './c02bb4d5-4202-490e-ae8f-ff4864fc0d2e/thread.json';
import thread11 from './d3e5adaf-084c-4dd5-9d29-94f1d6bccd98/thread.json';
import thread12 from './f4125791-0128-402a-8ca9-50e0947557e4/thread.json';
import thread13 from './fe3f7974-1bcb-4a01-a950-79673baafefd/thread.json';

export const threads = [
  { id: '21cfea46-34bd-4aa6-9e1f-3009452fbeb9', data: thread1 },
  { id: '3823e443-4e2b-4679-b496-a9506eae462b', data: thread2 },
  { id: '4f3e55ee-f853-43db-bfb3-7d1a411f03cb', data: thread3 },
  { id: '5aa47db1-d0cb-4eb9-aea5-3dac1b371c5a', data: thread4 },
  { id: '7cfa5f8f-a2f8-47ad-acbd-da7137baf990', data: thread5 },
  { id: '7f9dc56c-e49c-4671-a3d2-c492ff4dce0c', data: thread6 },
  { id: '90040b36-7eba-4b97-ba89-02c3ad47a8b9', data: thread7 },
  { id: 'ad76c455-5bf9-4335-8517-fc03834ab828', data: thread8 },
  { id: 'b83fbb2a-4e36-4d82-9de0-7b2a02c2092a', data: thread9 },
  { id: 'c02bb4d5-4202-490e-ae8f-ff4864fc0d2e', data: thread10 },
  { id: 'd3e5adaf-084c-4dd5-9d29-94f1d6bccd98', data: thread11 },
  { id: 'f4125791-0128-402a-8ca9-50e0947557e4', data: thread12 },
  { id: 'fe3f7974-1bcb-4a01-a950-79673baafefd', data: thread13 },
];

export function getThreadById(id: string) {
  return threads.find(t => t.id === id);
}
