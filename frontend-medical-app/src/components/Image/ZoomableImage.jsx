import React, { useState } from 'react';
import styles from './ZoomableImage.module.css';

const ZoomableImage = ({ src, alt, className, attribution }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={className}
                onClick={() => setOpen(true)}
                style={{ cursor: 'zoom-in' }}
            />

            {open && (
                <div className={styles.modal} onClick={() => setOpen(false)}>
                    <img src={src} alt={alt} className={styles.zoomedImage} />
                    {attribution && (
                        <div className={styles.attribution}>
                            {attribution}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ZoomableImage;
