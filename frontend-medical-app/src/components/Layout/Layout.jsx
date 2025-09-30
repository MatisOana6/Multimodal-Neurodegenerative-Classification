import React from 'react';
import Navbar from '../NavBar/NavBar.jsx';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <>
            <Navbar />
            <Outlet />
        </>
    );
};

export default Layout;
