import pandas as pd

csv_path_1 = r"D:/Licenta/Datasets/ADNI_Oficial/ADNI_DATASET.csv"
csv_path_2 = r"D:/Licenta/Datasets/ADNI_Oficial/ADNI_DATASET_2.csv"
output_csv = r"D:/Licenta/Datasets/ADNI_Oficial/ADNI_DATASET_FINAL.csv"

df1 = pd.read_csv(csv_path_1)
df2 = pd.read_csv(csv_path_2)

combined_df = pd.concat([df1, df2], ignore_index=True)

combined_df = combined_df.drop_duplicates(subset=["Image Data ID"])

combined_df.to_csv(output_csv, index=False)

print(f"CSV created successfully: {output_csv}")
