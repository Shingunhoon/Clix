'use client'

import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.left}>
          <div className={styles.copyright}>
            © 2025 CLIX. All rights reserved.
          </div>
        </div>
        <nav className={styles.quickLinks} aria-label="빠른 링크">
          <Link href="/hall-of-fame" className={styles.link}>
            명예전당
          </Link>
          <Link href="/yearly" className={styles.link}>
            연도별
          </Link>
          <Link href="/upload" className={styles.link}>
            업로드
          </Link>
          <Link href="/login" className={styles.link}>
            로그인
          </Link>
        </nav>
      </div>
    </footer>
  )
}
