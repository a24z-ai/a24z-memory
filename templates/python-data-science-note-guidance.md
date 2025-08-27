# Python Data Science Project Note Guidelines

## Preferred Note Types

### 🏗️ Data Architecture Decisions

- Data pipeline design and ETL choices
- Model selection and evaluation criteria
- Feature engineering strategies
- Deployment and serving architecture
- **Tags**: `architecture`, `decision`, `data-pipeline`

### 📊 Data Analysis Insights

- Dataset characteristics and limitations
- Exploratory data analysis findings
- Data quality issues and cleaning approaches
- **Tags**: `data-analysis`, `eda`, `data-quality`

### 🤖 Model Development

- Model selection rationale and trade-offs
- Hyperparameter tuning approaches
- Feature importance and selection
- Performance metrics and evaluation
- **Tags**: `model`, `ml`, `evaluation`, `features`

### 🔧 Code Patterns

- Data processing pipelines and utilities
- Reusable analysis functions
- Visualization patterns and best practices
- **Tags**: `pattern`, `python`, `visualization`

### ⚡ Performance Optimizations

- Memory usage optimizations for large datasets
- Computational efficiency improvements
- Parallel processing implementations
- **Tags**: `performance`, `optimization`, `memory`

## Preferred Tags

### Data Science Workflow

- `data-analysis`, `eda`, `preprocessing`
- `feature-engineering`, `model`, `evaluation`
- `visualization`, `reporting`

### Machine Learning

- `ml`, `supervised`, `unsupervised`
- `classification`, `regression`, `clustering`
- `deep-learning`, `neural-networks`

### Python Ecosystem

- `python`, `pandas`, `numpy`, `scikit-learn`
- `matplotlib`, `seaborn`, `jupyter`
- `tensorflow`, `pytorch`, `xgboost`

### Data & Infrastructure

- `data-pipeline`, `etl`, `database`
- `deployment`, `api`, `docker`
- `aws`, `gcp`, `azure`

## Data Science Specific Guidelines

### Dataset Documentation

```markdown
## Customer Segmentation Dataset

Located in `data/customer_data.csv` - 50K customer records with purchase history.

**Key Features**:

- Age, income, purchase frequency, category preferences
- 15% missing values in income field (use median imputation)
- Outliers in purchase amount (top 1% removed in preprocessing)

**Quality Issues**:

- Duplicate customer IDs (cleaned in `src/preprocessing/clean_customers.py`)
- Date format inconsistencies (standardized to ISO format)

**Tags**: dataset, preprocessing, segmentation
```

### Model Implementation Notes

```markdown
## Random Forest Feature Selection

Implementation in `src/models/feature_selection.py` - reduces 50 features to 15 most important.

**Approach**:

1. Train RF with all features
2. Extract feature importance scores
3. Select top 15 features with importance > 0.02
4. Validate performance drop < 5%

**Results**: Maintained 94% accuracy with 70% fewer features.

**Usage**: Call `select_features(X_train, y_train, threshold=0.02)`

**Tags**: feature-selection, random-forest, model
```

### Analysis Insights

```markdown
## Customer Churn Analysis - Key Findings

Analysis in `notebooks/churn_analysis.ipynb` - identified top churn predictors.

**Key Insights**:

- Support ticket frequency strongest predictor (correlation: 0.67)
- Monthly spend decline over 3 months indicates 85% churn probability
- Customer age 25-35 segment has highest churn rate (23%)

**Actionable Recommendations**:

- Proactive outreach for customers with 2+ support tickets
- Early warning system for spending decline patterns

**Tags**: churn, analysis, insights, customer-behavior
```

## Note Quality Guidelines

- **Include notebook references**: Link to Jupyter notebooks with analysis
- **Show data samples**: Include small data examples where relevant
- **Document assumptions**: Explain data assumptions and limitations
- **Include visualizations**: Reference charts and plots created
- **Explain business impact**: Connect technical findings to business value
- **Version control**: Note which data version or model iteration
- **Reproducibility**: Include seeds, parameters, and environment info
