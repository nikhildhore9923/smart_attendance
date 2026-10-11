import argparse

def prepare_data(source_dir, dest_dir):
    """
    Structure required:
    source_dir/
      live/
        user1_01.jpg
        ...
      spoof/
        photo_01.jpg
        video_01.jpg
        ...
        
    This script should run MTCNN to extract only the face crops
    and save them into train/val splits in dest_dir.
    """
    print(f"Preparing dataset from {source_dir} to {dest_dir}...")
    print("[TODO] Implement face cropping using MTCNN and train/val splitting.")
    print("Dataset preparation structure ready.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, required=True, help="Path to raw images")
    parser.add_argument("--dest", type=str, required=True, help="Path to save processed face crops")
    args = parser.parse_args()
    prepare_data(args.source, args.dest)
