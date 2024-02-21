import styles from './Footer.module.scss'
import { Row, Col, Button, Jumbotron } from 'react-bootstrap'
import { useTranslation } from 'react-i18next';
import signature from './../../../assets/images/logo.png';

function Footer(props) {
    const { t } = useTranslation('translations');

    return (
        <Jumbotron className={styles.footerContainer}>
        </Jumbotron >
    );
}
export default Footer;

/*
    Footer layout:
    SM:
    Col1
    Col2
    Col3

    MD:
    Col1 Col2
    Col3

    >=LG:
    Col1 Col2 Col3
*/