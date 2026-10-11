"""
STEP 4: Analytics Dashboard (the "Analytics Dashboard Module" from your synopsis).

Run this AFTER you've taken some attendance with attendance_system.py.
It reads attendance.csv and shows faculty-friendly views: today's
attendance, per-student totals, and a defaulter list.

Usage:
    streamlit run dashboard.py
"""

import os
from datetime import datetime

import pandas as pd
import streamlit as st

ATTENDANCE_FILE = "attendance.csv"
DATASET_DIR = "dataset"

st.set_page_config(page_title="Smart Attendance Dashboard", layout="wide")
st.title("📊 Smart Attendance Dashboard")
st.caption("AI-Based Smart Attendance System — Group A18")

# ---- Load data ----
if not os.path.isfile(ATTENDANCE_FILE):
    st.warning("No attendance recorded yet. Run attendance_system.py first.")
    st.stop()

df = pd.read_csv(ATTENDANCE_FILE)
df["Date"] = pd.to_datetime(df["Date"])

# ---- Enrolled students list (from dataset folder names) ----
enrolled = []
if os.path.isdir(DATASET_DIR):
    for folder in sorted(os.listdir(DATASET_DIR)):
        if os.path.isdir(os.path.join(DATASET_DIR, folder)):
            name_part, roll = folder.rsplit("_", 1)
            enrolled.append({"Name": name_part.replace("_", " "), "RollNo": roll})
enrolled_df = pd.DataFrame(enrolled)

# ---- Top metrics ----
today = pd.Timestamp(datetime.now().date())
today_df = df[df["Date"] == today]

col1, col2, col3 = st.columns(3)
col1.metric("Total Enrolled Students", len(enrolled_df))
col2.metric("Present Today", today_df["RollNo"].nunique())
col3.metric("Total Attendance Records", len(df))

st.divider()

# ---- Today's attendance ----
st.subheader("✅ Today's Attendance")
if today_df.empty:
    st.info("No attendance marked yet today.")
else:
    st.dataframe(today_df[["Name", "RollNo", "Time"]].sort_values("Time"), use_container_width=True)

# ---- Defaulter list (enrolled but not present today) ----
st.subheader("⚠️ Absent Today (Defaulter List)")
if not enrolled_df.empty:
    present_rolls = set(today_df["RollNo"].astype(str))
    absent_df = enrolled_df[~enrolled_df["RollNo"].astype(str).isin(present_rolls)]
    if absent_df.empty:
        st.success("Everyone enrolled is present today! 🎉")
    else:
        st.dataframe(absent_df, use_container_width=True)
else:
    st.info("No students enrolled yet.")

st.divider()

# ---- Attendance trend per student (all-time) ----
st.subheader("📈 Attendance Count Per Student (All-Time)")
if not df.empty:
    counts = df.groupby("Name")["Date"].nunique().reset_index()
    counts.columns = ["Name", "Days Present"]
    st.bar_chart(counts.set_index("Name"))

# ---- Full attendance log ----
with st.expander("View Full Attendance Log"):
    st.dataframe(df.sort_values("Date", ascending=False), use_container_width=True)
    st.download_button("Download as CSV", df.to_csv(index=False), "attendance_export.csv")
