import {createEffect, Match, Switch} from 'solid-js';
import {createStore, reconcile} from 'solid-js/store';
import api, {API_BASE, Slot, Task} from "./api.ts";
import WeekCalendar from "./WeekCalendar.tsx";
import {FileX2} from "lucide-solid";
import TaskList from "./TaskList.tsx";
import { userId } from "./userStore";

type LoadingState = {
  kind: "loading",
}

type ErrorState = {
  kind: "error",
  message: string,
}

export type PrimaryState = {
  kind: "primary",
  tasks: Task[],
  slots: Slot[],
}

type State = LoadingState | ErrorState | PrimaryState

function App() {
  const [state, setState] = createStore<State>({
    kind: "loading",
  });

  createEffect(async () => {
    try {
      const fetchedState = await api.getState(userId());
      setState(reconcile({
        kind: "primary",
        tasks: fetchedState.tasks,
        slots: fetchedState.slots,
        userId: fetchedState.userId,
      }));
    } catch (e) {
      console.error(e);
      setState(reconcile({
        kind: "error",
        message: (e as Error).message,
      }));
    }

    let websocket: WebSocket | null = null;
    let retryInterval = 1000;

    const connectWebSocket = () => {
      const apiWs = API_BASE.replace(/^https?:\/\//, 'ws://');
      websocket = new WebSocket(`${apiWs}/api/v0/user/${userId()}/ws`);

      websocket.onopen = () => {
        retryInterval = 1000;
      };

      websocket.onmessage = (event) => {
        const rawState = JSON.parse(event.data);
        const newState = api.rawStateToState(rawState);
        setState(reconcile({
          kind: "primary",
          tasks: newState.tasks,
          slots: newState.slots,
          userId: newState.userId,
        }));
      };

      websocket.onclose = () => {
        setState(reconcile({
          kind: "error",
          message: "Disconnected, trying to reconnect...",
        }));

        setTimeout(() => {
          connectWebSocket();
          retryInterval = Math.min(retryInterval * 2, 30000);
        }, retryInterval);
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        websocket?.close();
      };
    };

    connectWebSocket();

    return () => {
      websocket?.close();
    };
  });

  const stateKind = () => state.kind;

  return (
    <>
      <Switch>
        <Match when={stateKind() === "loading"}>
          <div role="status">
            <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span class="sr-only">Loading...</span>
          </div>
        </Match>
        <Match when={stateKind() == "error"}>
          <div class="center text-gray-500 flex flex-col gap-4 items-center">
            <FileX2 size={200} />
            <div class="text-2xl">
              Error occurred: {(state as ErrorState).message}
            </div>
            <div class="text-xl">
              This is our fault and we are working on it. Please try again later.
            </div>
          </div>
        </Match>
        <Match when={stateKind() === "primary"}>
          <div class="flex w-full gap-4 h-dvh">
            <div class="flex-1/4 h-dvh">
              <TaskList state={state as PrimaryState}/>
            </div>
            <div class="flex-3/4 h-dvh">
              <WeekCalendar state={state as PrimaryState}/>
            </div>
          </div>
        </Match>
      </Switch>
    </>
  );
}

export default App;
