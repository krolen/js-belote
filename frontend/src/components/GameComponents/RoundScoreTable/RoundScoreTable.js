import styles from './RoundScoreTable.module.scss'
import {useState, useEffect} from 'react'
import {useTranslation} from 'react-i18next';
import {Table, Button} from 'react-bootstrap'

function RoundScoreTable(props) {
    const {t} = useTranslation('translations');

    // add last 10 points to the team that got the last 4 cards
    const lastHandPoints = [0, 0]
    const totalRoundPoints = [0, 0]

    const [team1Correction, setTeam1Correction] = useState('0');
    const [team2Correction, setTeam2Correction] = useState('0');

    if (props.roundScore.card_scores) {
        // check if any round scores were issued - if both are zero, means that round was ended in passes
        if (props.roundScore.card_scores[0] + props.roundScore.card_scores[1] !== 0)
            lastHandPoints[props.roundScore.lastHandTeam] += 10;
        totalRoundPoints[0] = props.roundScore.card_scores[0] + props.roundScore.premium_scores[0] + lastHandPoints[0];
        totalRoundPoints[1] = props.roundScore.card_scores[1] + props.roundScore.premium_scores[1] + lastHandPoints[1];
    }

    const nextRoundAction = (event) => {
        event.preventDefault();
        const data = {
            team1Correction,
            team2Correction
        };
        console.log(`Calling with correction: ${data.team1Correction} ${data.team2Correction}`)
        props.nextRoundAction(data)
    }

    return (
        <div>
            <Table className={styles.roundOverTable} hover>
                <tr>
                    <th/>
                    <th>{t('roundScoreTable.team1PointsLabel')}</th>
                    <th>{t('roundScoreTable.team2PointsLabel')}</th>
                </tr>
                {props.roundScore.card_scores &&
                    <tr>
                        <th>{t('roundScoreTable.pointsFromCardsLabel')}</th>
                        <td>{props.roundScore.card_scores[0]}</td>
                        <td>{props.roundScore.card_scores[1]}</td>
                    </tr>
                }
                {props.roundScore.premium_scores &&
                    <tr>
                        <th>{t('roundScoreTable.pointsFromPremiumsLabel')}</th>
                        <td>{props.roundScore.premium_scores[0]}</td>
                        <td>{props.roundScore.premium_scores[1]}</td>
                    </tr>
                }
                {props.roundScore.premium_scores &&
                    <tr>
                        <th>{t('roundScoreTable.pointsFromLastHandLabel')}</th>
                        <td>{lastHandPoints[0]}</td>
                        <td>{lastHandPoints[1]}</td>
                    </tr>
                }
                {props.roundScore.premium_scores && props.roundScore.card_scores &&
                    <tr>
                        <th>{t('roundScoreTable.roundPointsSumLabel')}</th>
                        <th>{totalRoundPoints[0]}</th>
                        <th>{totalRoundPoints[1]}</th>
                    </tr>
                }
                {props.gameStatus.teamScores && props.gameStatus.teamLastRoundScores &&
                    <tr>
                        <th>{t('roundScoreTable.gamePointsLabel')}</th>
                        <th>{props.gameStatus.teamScores[0] - props.gameStatus.teamLastRoundScores[0]}</th>
                        <th>{props.gameStatus.teamScores[1] - props.gameStatus.teamLastRoundScores[1]}</th>
                    </tr>
                }

                {props.showNextRoundButton &&
                    <tr>
                        <th>Score corrections</th>
                        <td><input
                            type="number"
                            value={team1Correction}
                            onChange={(e) => setTeam1Correction(e.target.value)}
                            placeholder="Team 1 Score"
                        />
                        </td>
                        <td><input
                            type="number"
                            value={team2Correction}
                            onChange={(e) => setTeam2Correction(e.target.value)}
                            placeholder="Team 2 Score"
                        />
                        </td>
                    </tr>
                }
                {props.showNextRoundButton &&
                    <div>
                        <Button
                            className={styles.splitPromptFromSubmitButton}
                            onClick={nextRoundAction}
                            type="submit"
                        >
                            Next Round
                        </Button></div>
                }
            </Table>
        </div>
    )
}

export default RoundScoreTable
