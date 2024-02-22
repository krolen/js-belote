import {BrowserRouter, Routes, Route} from "react-router-dom";
import {v4 as uuidv4} from 'uuid';
import i18n from './i18n';
import {I18nextProvider} from 'react-i18next';
import {useEffect, useState} from 'react';

// contexts 
import {SocketContext, GameSettingsContext, GameSocketContext} from './modules/socketContexts';

// imports for handling server connection
import {connectToServerSocket} from './modules/socketActions';
import {getNoun, log} from "./modules/util";

// rendering components
import styles from './App.module.scss'
import './App.scss';
import MainPage from './content/MainPage';
import BelotePage from './content/BelotePage';
import LobbyPage from "./content/LobbyPage";
import Navbar from './components/SiteComponents/Navbar';
import Footer from './components/SiteComponents/Footer';
import {JaaSMeeting, JitsiMeeting} from "@jitsi/react-sdk";
import CONSTANTS from "./modules/CONSTANTS.json";


const App = () => {
    // **************************************************************************
    // GENERATE CONFIG FOR SERVER SOCKET CONNECTIONS
    // generate socket IDs once and then reuse them during user's stay on the website
    const [serverClientID] = useState(uuidv4());
    const [gameClientID] = useState(uuidv4());
    // only connect to server socket once and (try to) keep the connection alive
    const [serverSocket] = useState(connectToServerSocket(serverClientID));
    // **************************************************************************


    // **************************************************************************
    // START GameSettingsContext setup
    const [playerName, setPlayerName] = useState((localStorage.getItem('playerName'))
        ? localStorage.getItem('playerName') : getNoun());

    const updatePlayerName = (name) => {
        // store player name for reuse in future games
        localStorage.setItem('playerName', name);
        setPlayerName(name);
        log("debug", `Set playerName to: ${name}`)
    }


    const [gameRoomId, setGameRoomId] = useState("");
    const updateGameRoomId = (name) => {
        setGameRoomId(name);
        log("debug", `Set gameRoomId to: ${gameRoomId}`)
    }
    // END GameSettingsContext setup
    // **************************************************************************

    useEffect(() => {
        console.log("Welcome to Belote with Friends")
    }, [])

    return (
        <I18nextProvider i18n={i18n}>
            <div className={styles.AppColumn}>
                <div className={styles.content}>
                    <BrowserRouter>
                        <SocketContext.Provider value={[serverClientID, serverSocket]}>
                            <Navbar/>
                        </SocketContext.Provider>
                        <div className={styles.App}>
                            <Routes>
                                <Route exact
                                       path='/belote/lobby/:roomID'
                                       element={
                                           <SocketContext.Provider value={[serverClientID, serverSocket]}>
                                               <GameSettingsContext.Provider value={
                                                   [playerName, updatePlayerName, gameRoomId, updateGameRoomId]
                                               }>
                                                   <LobbyPage/>
                                               </GameSettingsContext.Provider>
                                           </SocketContext.Provider>
                                       }
                                />
                                <Route exact
                                       path='/belote/game/:urlRoomId'
                                       element={
                                           <GameSocketContext.Provider value={[gameClientID]}>
                                               <GameSettingsContext.Provider value={
                                                   [playerName, updatePlayerName, gameRoomId, updateGameRoomId]
                                               }>
                                                   <BelotePage/>
                                               </GameSettingsContext.Provider>
                                           </GameSocketContext.Provider>
                                       }
                                />
                                <Route
                                    path='/'
                                    element={
                                        <SocketContext.Provider value={[serverClientID, serverSocket]}>
                                            <MainPage/>
                                        </SocketContext.Provider>
                                    }
                                />
                            </Routes>

                            <div className={styles.additionalComponent}>
                                <JaaSMeeting
                                    domain={CONSTANTS.video_server_addr}
                                    appId="MyAPP"
                                    configOverwrite={{
                                        startWithAudioMuted: true,
                                        disableThirdPartyRequests: true,
                                        disableLocalVideoFlip: true,
                                        backgroundAlpha: 0.5,
                                        enableEmailInStats: false
                                    }}
                                    interfaceConfigOverwrite={{
                                        VIDEO_LAYOUT_FIT: 'nocrop',
                                        MOBILE_APP_PROMO: false,
                                        TILE_VIEW_MAX_COLUMNS: 4,
                                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
                                    }}
                                    roomName="SuperMegaRoom1234567890"
                                    userInfo={{
                                        displayName: 'YOUR_USERNAME'
                                    }}
                                    getIFrameRef={(iframeRef) => {
                                        iframeRef.style.height = '900px';
                                        iframeRef.style.width = '700px';
                                        iframeRef.style.marginTop = '10px';
                                        iframeRef.style.border = '10px dashed #df486f';
                                        iframeRef.style.padding = '5px';
                                    }}

                                    useStaging={true}
                                />
                            </div>
                        </div>
                    </BrowserRouter>
                </div>
                <Footer/>
            </div>

        </I18nextProvider>
    );
}

export default App;
