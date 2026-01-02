"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";

interface NavigationProps {
  isHero?: boolean;
}

export default function Navigation({ isHero = false }: NavigationProps) {
  const { userType, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={closeMobileMenu}
        >
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '280px',
              maxWidth: '85vw',
              height: '100vh',
              background: 'var(--surface)',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.2)',
              padding: '2rem 1.5rem',
              overflowY: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <span className="font-display" style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--primary)'
              }}>
                TourneyRadar
              </span>
              <button
                onClick={closeMobileMenu}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <Link 
                href="/tournaments"
                onClick={closeMobileMenu}
                className="mobile-nav-link"
              >
                Tournaments
              </Link>
              <Link 
                href="/tournaments/completed"
                onClick={closeMobileMenu}
                className="mobile-nav-link"
              >
                Completed Events
              </Link>
              
              {!authLoading && (
                userType === "player" ? (
                  <Link 
                    href="/player/dashboard"
                    onClick={closeMobileMenu}
                    style={{
                      padding: '1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1rem'
                    }}
                  >
                    My Dashboard
                  </Link>
                ) : userType === "organizer" ? (
                  <Link 
                    href="/organizer/dashboard"
                    onClick={closeMobileMenu}
                    style={{
                      padding: '1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1rem'
                    }}
                  >
                    Organizer Dashboard
                  </Link>
                ) : userType === "admin" ? (
                  <Link 
                    href="/admin/dashboard"
                    onClick={closeMobileMenu}
                    style={{
                      padding: '1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1rem'
                    }}
                  >
                    Admin Panel
                  </Link>
                ) : (
                  <Link 
                    href="/player/login"
                    onClick={closeMobileMenu}
                    style={{
                      padding: '1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      fontWeight: 600,
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '1rem'
                    }}
                  >
                    Player Login
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className={isHero ? "glass" : "glass"} style={isHero ? {} : { position: "sticky", top: 0, zIndex: 100 }}>
        <div className="nav-container">
          <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
            TourneyRadar
          </Link>

          <div className="nav-links">
            <Link href="/tournaments" style={{ textDecoration: "none", color: "inherit" }}>
              Tournaments
            </Link>
            <Link href="/tournaments/completed" style={{ textDecoration: "none", color: "inherit" }}>
              Completed Events
            </Link>
            {!authLoading && (
              userType === "player" ? (
                <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                  My Dashboard
                </Link>
              ) : userType === "organizer" ? (
                <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                  Organizer Dashboard
                </Link>
              ) : userType === "admin" ? (
                <Link href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                  Admin Panel
                </Link>
              ) : (
                <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                  Player Login
                </Link>
              )
            )}
          </div>

          <button 
            className="mobile-menu-btn" 
            onClick={toggleMobileMenu} 
            aria-label="Menu"
            style={{
              display: 'block',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}