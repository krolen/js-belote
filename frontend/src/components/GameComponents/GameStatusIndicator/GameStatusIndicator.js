import styles from './GameStatusIndicator.module.scss';
import {useTranslation} from 'react-i18next';
import IndicatorBox from './../IndicatorBox';
import {Table, ListGroup, InputGroup, Button} from 'react-bootstrap'
import {useEffect, useState} from "react";

function GameStatusIndicator(props) {
    const {t} = useTranslation('translations');

    const [team0, setTeam0] = useState(props.gameStatus ? props.gameStatus.teams[0] : ["?0"]);
    const [team1, setTeam1] = useState(props.gameStatus ? props.gameStatus.teams[1] : ["?1"]);

    const handleMoveToTeam1 = (index) => {
        const itemToMove = team0[index];
        const newList0 = team0.filter((_, i) => i !== index);
        const newList1 = [...team1, itemToMove];
        setTeam0(newList0);
        setTeam1(newList1);
    };
    const handleMoveToTeam0 = (index) => {
        const itemToMove = team1[index];
        const newList1 = team1.filter((_, i) => i !== index);
        const newList0 = [...team0, itemToMove];
        setTeam0(newList0);
        setTeam1(newList1);
    };

    const doSwitchPlayers = () => {
        let result = []
        result.push(team0[0])
        result.push(team1[0])
        result.push(team0[1])
        result.push(team1[1])

        props.switchPlayers(result)
    }

    useEffect(() => {
        console.log("updating teams " +  + JSON.stringify(props.gameStatus))
        if(props.gameStatus && (props.gameStatus.teamsValid === true)) {
            setTeam0(props.gameStatus.teams[0])
            setTeam1(props.gameStatus.teams[1])
        }
    }, [props]);

    console.log("re-render component")
    if (props.gameStatus) {
        if (props.gameStatus.teamsValid === true) {
            console.log("teams are valid " + JSON.stringify(props.gameStatus));
            return (
                <div className={styles.container}>
                    <IndicatorBox
                        header={t('gameStatusIndicator.containerLabel')}
                        scroll={false}
                        height={14.5}
                        content={
                            <div>
                                <Table className={styles.gameInfoTable}>
                                    <thead className={styles.tableHeader}>
                                    <tr className={styles.tableHeaderRow}>
                                        <th className={styles.tableHeaderData}>Team 1</th>
                                        <th className={styles.tableHeaderData}>Team 2</th>
                                        <th/>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr className={styles.tableHeaderRow}>
                                        <td>
                                            <ul>
                                                {team0.map((item, index) => (
                                                    <li key={index}>
                                                        {item}
                                                        <button onClick={() => handleMoveToTeam1(index)}>Move to Team
                                                            2
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>
                                            <ul>
                                                {team1.map((item, index) => (
                                                    <li key={index}>
                                                        {item}
                                                        <button onClick={() => handleMoveToTeam0(index)}>Move to Team
                                                            1
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>
                                            <Button
                                                className={styles.splitPromptFromSubmitButton}
                                                onClick={doSwitchPlayers}
                                                type={"submit"}
                                            > Switch Players </Button>
                                        </td>
                                    </tr>

                                    <tr>
                                        <th className={styles.tableHeaderData}>{t('gameStatusIndicator.scoreLabel')}</th>
                                        <td className={styles.tableBodyData}>{props.gameStatus.teamScores[0]}</td>
                                        <td className={styles.tableBodyData}>{props.gameStatus.teamScores[1]}</td>
                                    </tr>
                                    </tbody>
                                </Table>
                                <ListGroup variant="flush">
                                    {((props.roundStatus.status === 'in_progress' || props.roundStatus.status === 'suit_selected') && (props.gameStatus.status !== 'over')) &&
                                        <ListGroup.Item>
                                            {t('gameStatusIndicator.roundSuitLabel')}
                                            <b> {t(`suitSelector.suits.${props.roundStatus.suitInfo.suit}`)}</b>
                                            {t('gameStatusIndicator.roundSuitCallerLabel')}
                                            <b>{props.roundStatus.suitInfo.caller}</b>
                                        </ListGroup.Item>
                                    }
                                    {(props.gameStatus.status === 'over') &&
                                        <ListGroup.Item>
                                            {t('gameStatusIndicator.winningTeamLabel')}
                                            <b>{props.gameStatus.winningTeam}</b>
                                        </ListGroup.Item>
                                    }
                                </ListGroup>
                            </div>
                        }
                    />

                </div>
            );
        } else {
            return (

                <div className={styles.container}>
                    <IndicatorBox
                        header={t('gameStatusIndicator.containerLabel')}
                        scroll={false}
                        height={14.5}
                        content={
                            <div>
                                <Table>
                                    <thead className={styles.tableHeader}>
                                    <tr className={styles.tableHeaderRow}>
                                        <th>{t('gameStatusIndicator.teamLabel')} 1</th>
                                        <th>{t('gameStatusIndicator.teamLabel')} 2</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {props.gameStatus.teams &&
                                        <tr>
                                            <td>
                                                {props.gameStatus.teams[0][0]} {props.gameStatus.teams[0][1]}
                                            </td>
                                            <td>
                                                {props.gameStatus.teams[1][0]} {props.gameStatus.teams[1][1]}
                                            </td>
                                        </tr>
                                    }
                                    </tbody>
                                </Table>
                                <label
                                    className={styles.waitingLabel}>{t('gameStatusIndicator.waitingForLabelsToConnectLabel')}</label>
                                <InputGroup.Text disabled>
                                    {`http://localhost/game/room/${props.roomID}`}
                                    {/*{`https://belotewithfriends.tk/game/room/${props.roomID}`}*/}
                                </InputGroup.Text>
                            </div>
                        }
                    />
                </div>
            )
        }
    } else return (
        <div>
            {t('gameStatusIndicator.waitingToConnectToServerLabel')}
        </div>
    );
}

export default GameStatusIndicator;