import styles from './GameBoard.module.scss'
import {useTranslation} from 'react-i18next';
import {useState} from 'react'
import Card from '../Card';
import BlankHand from '../BlankHand';
import SuitSelector from '../SuitSelector';
import RoundScoreTable from '../RoundScoreTable';
import {Button, Form} from 'react-bootstrap';

function GameBoard(props) {
    const {t} = useTranslation('translations');
    const [splitOnCardIndex, setSplitOnCardIndex] = useState(16)
    const [promptCardErrorText, setPromptCardErrorText] = useState(null)


    const reArrangeArrToLocalOrder = (arrayOfItems) => {
        let playerArr = [...props.roundStatus.players]
        const localUserame = props.localUsername
        const offSetIndex = playerArr.indexOf(localUserame);

        let res = []
        res.push(arrayOfItems[offSetIndex % 4])
        res.push(arrayOfItems[(offSetIndex - 1 + 4) % 4])
        res.push(arrayOfItems[(offSetIndex - 2 + 4) % 4])
        res.push(arrayOfItems[(offSetIndex - 3 + 4) % 4])
        //
        // const arrPiece = arrayOfItems.splice(0, offSetIndex)
        // return arrayOfItems.concat(arrPiece)
        return res
    }

    let localPlayerPositions = []
    let localCardCounts = [[], [], []]
    let localCardsOnTable = [{displayEmpty: true}, {displayEmpty: true}, {displayEmpty: true}, {displayEmpty: true}]
    let tableCenter = null
    let eNumOfCards = 0
    let nNumOfCards = 0
    let wNumOfCards = 0
    let localDealerPosition = [false, false, false, false]
    let localStartingPlayerPosition = [false, false, false, false]
    let localPlayerLabels = [null, null, null, null]
    let localPlayerCallIndicators = [<div/>, <div/>, <div/>, <div/>]
    let meetingUrl = "unknown"

    //render gameboard contents here
    if (props.roundStatus) {
        localPlayerPositions = reArrangeArrToLocalOrder([...props.roundStatus.players])
        const playerIndicator = (
            <div className={styles.currentPlayerLabel}>
                {t('gameBoard.playerTurnIndicator')} {props.roundStatus.pTurnName}
            </div>
        );

        if (props.roundStatus.status === 'waiting_for_split') {
            if (props.roundStatus.pTurnName === props.localUsername) {

                const handleSplitIndexSelect = (event) => {
                    event.preventDefault();
                    if (splitOnCardIndex > 0 && splitOnCardIndex < 32) {
                        // console.log(splitOnCardIndex)
                        props.handleDeckSplit(splitOnCardIndex)
                    } else {
                        setSplitOnCardIndex(16)
                        setPromptCardErrorText('Please enter a number between 0 and 32')
                    }
                }

                tableCenter = (
                    < div className={styles.splitPromptContainer}>
                        <div className={styles.splitPromptTextContainer}>
                            <p>{t('gameBoard.deckSplitPromptText')}</p>
                            <p className={styles.splitPromptTextContainerErrorText}>
                                {promptCardErrorText}
                            </p>
                        </div>
                        <div>
                            <Form>
                                <input
                                    type="number"
                                    onChange={event => setSplitOnCardIndex(event.target.value)}
                                    value={splitOnCardIndex}
                                />
                                <br/>
                                <Button
                                    className={styles.splitPromptFromSubmitButton}
                                    onClick={handleSplitIndexSelect}
                                    type={"submit"}
                                >
                                    {t('gameBoard.deckSplitPromptSubmitButtonText')}
                                </Button>
                            </Form>
                        </div>
                    </div>
                );
            } else {
                tableCenter = (
                    < div className={styles.tableGrid}>
                        {/* this is a 3x3 grid */}
                        < div/>
                        < div/>
                        < div/>
                        < div/>
                        {playerIndicator}
                        < div/>
                        < div/>
                        <div/>
                        < div/>
                    </div>
                );
            }
        } else {
            localCardCounts = reArrangeArrToLocalOrder([...props.roundStatus.handSizes])
            localCardCounts.shift()
            // console.log(localCardCounts)

            if (props.roundStatus.status === 'started_selecting_suit') {
                if (props.roundStatus.pTurnName === props.localUsername) {

                    let suitOptions = []
                    if (props.validSuitOptions) suitOptions = props.validSuitOptions

                    tableCenter = (
                        < div className={styles.splitPromptContainer}>
                            <div className={styles.splitPromptTextContainer}>
                                <p>{t('gameBoard.suitSelectPromptText')}</p>
                                <p className={styles.splitPromptTextContainerErrorText}>
                                    {promptCardErrorText}
                                </p>
                            </div>
                            <SuitSelector
                                options={suitOptions}
                                suit={props.roundStatus.suitInfo.suit}
                                calledBy={props.roundStatus.suitInfo.caller}
                                suitSelectionHistory={props.suitSelectionHistory}
                                currentRoundNum={props.gameStatus.roundNum}
                                handleSuitSelect={props.handleSuitSelect}
                            />
                        </div>
                    );

                } else {
                    // show previous bid if there is anything in the bid history
                    if (props.suitSelectionHistory.length > 0) {
                        let lastCallArr = [null, null, null, null];
                        const lastCall = props.suitSelectionHistory[props.suitSelectionHistory.length - 1]
                        lastCallArr[props.roundStatus.players.indexOf(lastCall.madeBy)] = lastCall;
                        lastCallArr = reArrangeArrToLocalOrder(lastCallArr);

                        const lastCallElements = [...localPlayerCallIndicators];
                        for (let i = 0; i < lastCallArr.length; i++) {
                            const call = lastCallArr[i];
                            if (call) {
                                lastCallElements[i] = (
                                    <div className={styles.currentPlayerLabel}>
                                        {t(`suitSelector.suits.${call.suitSelection}`)}
                                    </div>
                                );
                            }
                        }
                        localPlayerCallIndicators = lastCallElements;
                    }
                    tableCenter = (
                        < div className={styles.tableGrid}>
                            {/* this is a 3x3 grid */}
                            < div/>
                            < div/>
                            < div/>
                            < div/>
                            {playerIndicator}
                            < div/>
                            < div/>
                            <div/>
                            < div/>
                        </div>
                    );
                }
            } else {
                if (props.roundStatus.status === 'over' && props.roundScore) {
                    console.log(props.roundScore)
                    tableCenter = (
                        < div className={styles.splitPromptContainer}>
                            <div className={styles.splitPromptTextContainer}>
                                <h4>{t('gameBoard.roundOverPromptText')}</h4>
                                <p className={styles.splitPromptTextContainerErrorText}>
                                    {promptCardErrorText}
                                </p>
                            </div>
                            {props.roundScore &&
                                <RoundScoreTable
                                    gameStatus={props.gameStatus}
                                    roundScore={props.roundScore}
                                    nextRoundAction={props.nextRoundAction}
                                    showNextRoundButton={props.roundStatus.pTurnName === props.localUsername}
                                />
                            }
                        </div>
                    );
                } else {
                    //figure out local table card placements
                    for (const card of props.roundStatus.cardsOnTable) {
                        const tmpIndex = localPlayerPositions.indexOf(card.placedBy);
                        if (tmpIndex > -1)
                            localCardsOnTable[tmpIndex] = card;
                    }

                    let sCard = localCardsOnTable[0]
                    let eCard = localCardsOnTable[1]
                    let nCard = localCardsOnTable[2]
                    let wCard = localCardsOnTable[3]

                    tableCenter = (
                        < div className={styles.tableGrid}>
                            {/* this is a 3x3 grid */}
                            < div/>
                            <Card {...nCard} handleOnCLick={() => {
                            }} active={true}/>
                            <div/>
                            <Card {...wCard} handleOnCLick={() => {
                            }} active={true}/>
                            {playerIndicator}
                            <Card {...eCard} handleOnCLick={() => {
                            }} active={true}/>
                            <div/>
                            <Card {...sCard} handleOnCLick={() => {
                            }} active={true}/>
                            <div/>
                        </div>
                    );
                }
            }
        }
    }

    if (props.gameStatus) {
        meetingUrl = props.gameStatus.meetingUrl
    }

    eNumOfCards = localCardCounts[0]
    nNumOfCards = localCardCounts[1]
    wNumOfCards = localCardCounts[2]

    const eSecondColumnCardCount = Math.floor(eNumOfCards / 2)
    const eFirstColumnCardCount = eNumOfCards - eSecondColumnCardCount

    const wSecondColumnCardCount = Math.floor(wNumOfCards / 2)
    const wFirstColumnCardCount = wNumOfCards - wSecondColumnCardCount

    //create player nametag labels
    if (props.gameStatus && props.roundStatus) {
        const dealer = (props.gameStatus.roundNum + 1) % 4;
        localDealerPosition[dealer] = true
        localStartingPlayerPosition[(dealer + 1) % 4] = true
        // localStartingPlayerPosition[(props.gameStatus.roundNum + 2) % 4] = true

        localDealerPosition = reArrangeArrToLocalOrder([...localDealerPosition])
        localStartingPlayerPosition = reArrangeArrToLocalOrder([...localStartingPlayerPosition])

        for (let i = 0; i < localPlayerLabels.length; i++) {
            if (localDealerPosition[i]) localPlayerLabels[i] = t("gameBoard.dealerPlayerLabel")
            if (localStartingPlayerPosition[i]) localPlayerLabels[i] = t("gameBoard.startingPlayerLabel")
        }
    }


    return (
        <div className={styles.overAllContainer}>

            <div/>
            <BlankHand
                cardCount={nNumOfCards}
                vertical={false}
                roundStatus={props.roundStatus.status}
            />
            <div/>
            <div className={styles.handsSideBySide}>
                <div className={styles.verticalCardContainer}>
                    <BlankHand
                        cardCount={wFirstColumnCardCount}
                        vertical={true}
                        roundStatus={props.roundStatus.status}
                    />
                </div>
                <div className={styles.verticalCardContainer}>
                    <BlankHand
                        cardCount={wSecondColumnCardCount}
                        vertical={true}
                        roundStatus={props.roundStatus.status}
                    />
                </div>
            </div>
            <div className={styles.northPTagAndGameBoardContainer}>
                <div className={styles.horizontalPlayerTag}>
                    <div>
                        <h5 className={styles.playerLabelText}>
                            {localPlayerPositions[2]}{localPlayerLabels[2]}
                        </h5>
                    </div>
                </div>
                <div className={styles.displayElementsInOneLine}>
                    <div className={styles.verticalPlayerTagContainer}>
                        <div className={styles.verticalPlayerTagLeft}>
                            <h5 className={styles.playerLabelText}>
                                {localPlayerPositions[3]}{localPlayerLabels[3]}
                            </h5>
                        </div>
                    </div>
                    <div className={styles.gameBoardContainer}>
                        <div className={styles.tableContainer}>
                            <div/>
                            {localPlayerCallIndicators[2]}
                            <div/>
                            {localPlayerCallIndicators[3]}{tableCenter}{localPlayerCallIndicators[1]}
                            <div/>
                            {localPlayerCallIndicators[0]}
                            <div/>
                        </div>
                    </div>
                    <div className={styles.verticalPlayerTagContainer}>
                        <div className={styles.verticalPlayerTagRight}>
                            <h5 className={styles.playerLabelText}>
                                {localPlayerPositions[1]}{localPlayerLabels[1]}
                            </h5>
                        </div>
                    </div>
                </div>
                <div className={styles.horizontalPlayerTag}>
                    <div>
                        <h5 className={styles.playerLabelText}>
                            {localPlayerPositions[0]}{localPlayerLabels[0]}
                        </h5>
                    </div>
                </div>
            </div>
            <div className={styles.handsSideBySide}>
                <div className={styles.verticalCardContainer}>
                    <BlankHand
                        cardCount={eFirstColumnCardCount}
                        vertical={true}
                        roundStatus={props.roundStatus.status}
                    />
                </div>
                <div className={styles.verticalCardContainer}>
                    <BlankHand
                        cardCount={eSecondColumnCardCount}
                        vertical={true}
                        roundStatus={props.roundStatus.status}
                    />
                </div>
            </div>
        </div>
    );

}

export default GameBoard;