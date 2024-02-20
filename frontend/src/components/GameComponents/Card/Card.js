import styles from './Card.module.scss'
import {useTranslation} from 'react-i18next';
import ManagerComponent from './../../../assets/cards/ManagerComponent'

import {useState, useEffect} from 'react';

function useSingleAndDoubleClick(actionSimpleClick, actionDoubleClick, delay = 250) {
    const [click, setClick] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            // simple click
            if (click === 1) actionSimpleClick();
            setClick(0);
        }, delay);

        // the duration between this click and the previous one
        // is less than the value of delay = double-click
        if (click === 2) actionDoubleClick();

        return () => clearTimeout(timer);

    }, [click]);

    return () => setClick(prev => prev + 1);
}

const Card = (props) => {
    const {t} = useTranslation('translations');

    const handleOnCLick = () => {
        if (props.active)
            props.handleOnCLick(props.index)
    }

    const handleOnDblCLick = () => {
        if (props.active)
            props.handleOnDblCLick(props.index)
    };

    const click = useSingleAndDoubleClick(handleOnCLick, handleOnDblCLick);


    // handle a card the player sees
    if (props.suit && props.rank) {
        let textClass = styles.blackSuit
        if (props.suit === 'H' || props.suit === 'D') textClass = styles.redSuit
        return (
            <div className={props.selected ? styles.selectedCardContainer : styles.cardContainer}
                 onClick={click}
            >
                <div className={props.active ? null : styles.inactiveOverlay}>
                    <ManagerComponent
                        suit={props.suit}
                        rank={props.rank}
                    />
                </div>
            </div>
        );
    }
    // handle a card the player doesn't see
    else {
        if (props.displayEmpty) {
            return (
                <div
                    className={styles.cardContainer}
                    style={{
                        backgroundColor: "green"
                    }}
                />
            );
        } else {
            return (
                <div className={styles.blankCardContainer}>
                    <div className={styles.emptyCard}>
                        <div className={styles.svgContainer}/>
                    </div>
                </div>
            );
        }
    }
}

export default Card;