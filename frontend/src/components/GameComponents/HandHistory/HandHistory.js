import styles from './HandHistory.module.scss'
import IndicatorBox from './../IndicatorBox'
import { useTranslation } from 'react-i18next';
import { Table } from 'react-bootstrap'
import Card from "../Card";

function HandHistory(props) {
    const { t } = useTranslation('translations');

    const history = []
    if (props.roundStatus.handHistory) {
        //create table header
        const players = [...props.roundStatus.players]
        const playerNames = []
        for (const player of players) {
            playerNames.push(
                <th key={player} className={styles.tablePlayerName}>
                    {player}
                </th>
            );
        }

        // create table rows and data cells
        for (const historyItem of props.roundStatus.handHistory) {
            const rowItems = [null, null, null, null]
            //create rows
            for (const historyCard of historyItem.cards) {
                let item
                if (historyCard.rank === historyItem.strongest.rank && historyCard.suit === historyItem.strongest.suit)

                    item = (
                        <td className={styles.strongestCardTD} key={historyCard.rank + historyCard.suit}>
                        <div className={styles.verticalListItem}>
                            <Card
                                rank={historyCard.rank}
                                suit={historyCard.suit}
                                active={false}
                            />
                        </div>
                        </td>
                    );
                else
                    item = (
                        <td className={styles.cardTD} key={historyCard.rank + historyCard.suit}>
                            <div className={styles.verticalListItem}>
                                <Card
                                    rank={historyCard.rank}
                                    suit={historyCard.suit}
                                    active={false}
                                />
                            </div>
                        </td>
                    );

                rowItems.splice(players.indexOf(historyCard.placedBy), 0, item);
            }

            const historyTR = (
                <tr key={historyItem.cards[0].rank + historyItem.cards[0].suit}>
                    {rowItems}
                </tr>
            );
            history.push(historyTR);
        }

        history.reverse()

        let historySize = 1
        // if game is in progress cut history so only last three cards are visible
        if (history.length > historySize && props.roundStatus.status === 'in_progress') history.length = historySize
        // make the table always have 3 data rows so that it doesn't change size in the beginning of the game
        while (history.length < historySize) history.push(<tr key={history.length} />)

        let containerHeader
        if (props.roundStatus.status === 'in_progress') containerHeader = t('handHistory.containerLabel3Hands')
        else if (props.roundStatus.status === 'over') containerHeader = t('handHistory.containerLabelFull')
        else containerHeader = t('handHistory.containerLabel')

        return (
            <div className={styles.container}>
                <IndicatorBox
                    header={containerHeader}
                    scroll={!(props.roundStatus.status === 'in_progress')}
                    height={13.5}
                    content={
                        <div className={styles.tableContainer} >
                            <Table className={styles.historyTable} striped hover>
                                <thead>
                                    <tr>
                                        {playerNames}
                                    </tr>
                                </thead>
                                {history.length > 0 &&
                                    <tbody>
                                        {history}
                                    </tbody>
                                }
                            </Table>
                        </div>
                    }
                />
            </div>
        );
    }
    else {
        return (
            <div />
        );
    }
}
export default HandHistory;