import { useEffect, useRef } from 'react'
import './SignIn.css'

function SignIn({ google, error }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!google || !buttonRef.current) return
    buttonRef.current.replaceChildren()
    google.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
    })
    google.prompt()
  }, [google])

  return (
    <main className="sign-in">
      <div className="sign-in__card">
        <h1 className="sign-in__title">Family Tree</h1>
        <p className="sign-in__text">Sign in with Google to view and edit your family tree.</p>
        <div ref={buttonRef} className="sign-in__button" />
        {!google && !error && <p className="sign-in__text">Loading sign-in…</p>}
        {error && (
          <p className="sign-in__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

export default SignIn
